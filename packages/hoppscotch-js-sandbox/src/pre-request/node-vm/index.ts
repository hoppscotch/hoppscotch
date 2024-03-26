import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import ivm from "isolated-vm"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "~/utils"

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
            const { pw, updatedEnvs } = getPreRequestScriptMethods(envs)

            // Expose pw to the context
            await context.global.set("pw", pw)
            await context.global.set("atob", globalThis.atob)
            await context.global.set("btoa", globalThis.btoa)

            // Create a script and compile it
            const script = await isolate.compileScript(preRequestScript)
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
