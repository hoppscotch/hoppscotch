import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { createRequire } from "module"

import type ivmT from "isolated-vm"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "~/utils"

const nodeRequire = createRequire(import.meta.url)
const ivm = nodeRequire("isolated-vm")

const getSerializedAPIMethods = (
  namespaceObj: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(namespaceObj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = getSerializedAPIMethods(value as Record<string, unknown>)
    } else if (typeof value === "function") {
      result[key] = new ivm.Reference(value)
    } else {
      result[key] = value
    }
  }

  return result
}

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
                get: (target, prop) => {
                    if (prop in target && typeof target[prop] === "object") {
                      return new Proxy(target[prop], {
                        get: (subTarget, subProp) => {
                          if (subProp in subTarget && subTarget[subProp].typeof === "function") {
                            return (...args) => subTarget[subProp].applySync(null, args)
                          }

                          return
                        },
                      })
                    }
          
                    return
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
