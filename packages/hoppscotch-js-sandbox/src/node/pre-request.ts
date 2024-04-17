import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { createRequire } from "module"

import type ivmT from "isolated-vm"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "~/shared-utils"
import { getSerializedAPIMethods } from "./utils"

const nodeRequire = createRequire(import.meta.url)
const ivm = nodeRequire("isolated-vm")

export const runPreRequestScript = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> =>
  pipe(
    TE.tryCatch(
      async () => {
        const isolate: ivmT.Isolate = new ivm.Isolate()
        const context = await isolate.createContext()
        return { isolate, context }
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain(({ isolate, context }) =>
      pipe(
        TE.tryCatch(
          async () => {
            const jail = context.global

            const { pw, updatedEnvs } = getPreRequestScriptMethods(envs)

            const serializedAPIMethods = getSerializedAPIMethods(pw)
            jail.setSync("serializedAPIMethods", serializedAPIMethods, {
              copy: true,
            })

            jail.setSync("atob", atob)
            jail.setSync("btoa", btoa)

            // Methods in the isolate context can't be invoked straightaway
            const finalScript = `
              const pw = new Proxy(serializedAPIMethods, {
                get: (pwObjTarget, pwObjProp) => {
                  const topLevelEntry = pwObjTarget[pwObjProp]

                  // "pw.env" set of API methods
                    if (topLevelEntry && typeof topLevelEntry === "object") {
                      return new Proxy(topLevelEntry, {
                        get: (subTarget, subProp) => {
                          const subLevelProperty = subTarget[subProp]
                          if (subLevelProperty && subLevelProperty.typeof === "function") {
                            return (...args) => subLevelProperty.applySync(null, args)
                          }
                        },
                      })
                    }
                }
              })

              ${preRequestScript}
            `

            // Create a script and compile it
            const script = await isolate.compileScript(finalScript)

            // Run the pre-request script in the provided context
            await script.run(context)

            return updatedEnvs
          },
          (reason) => reason
        ),
        TE.fold(
          (error) => TE.left(`Script execution failed: ${error}`),
          (result) =>
            pipe(
              TE.tryCatch(
                async () => {
                  await isolate.dispose()
                  return result
                },
                (disposeError) => `Isolate disposal failed: ${disposeError}`
              )
            )
        )
      )
    )
  )
