import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import ivm from "isolated-vm"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "~/utils"

// Function to recursively wrap functions in `ivm.Reference`
const wrapMethodsInReference = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const wrappedObj: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      wrappedObj[key] = wrapMethodsInReference(value as Record<string, unknown>)
    } else if (typeof value === "function") {
      wrappedObj[key] = new ivm.Reference(value)
    } else {
      wrappedObj[key] = value
    }
  }

  return wrappedObj
}

export const runPreRequestScript = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> =>
  pipe(
    TE.tryCatch(
      async () => {
        const isolate = new ivm.Isolate()
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

            const wrappedMethods = wrapMethodsInReference(pw)
            jail.setSync("wrappedMethods", wrappedMethods, { copy: true })

            await context.global.set("atob", globalThis.atob)
            await context.global.set("btoa", globalThis.btoa)

            // Methods in the isolate context can't be invoked straightaway
            const finalScript = `
              const getResolvedMethods = (
                obj
              ) => {
                const result = {}
                
                for (const [key, value] of Object.entries(obj)) {
                  if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
                    result[key] = getResolvedMethods(value)
                  } else if(value.typeof === "function") {
                    result[key] = (...args) => value.applySync(null, args) 
                  } else {
                    result[key] = value
                  }
                }
                
                return result
              }

              const pw = getResolvedMethods(wrappedMethods)

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
