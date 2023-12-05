import { Environment } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { createContext, runInContext } from "vm"

import { getPreRequestScriptMethods } from "../../utils"

type Envs = {
  global: Environment["variables"]
  selected: Environment["variables"]
}

export const runPreRequestScript = (
  preRequestScript: string,
  envs: Envs
): TE.TaskEither<string, Envs> =>
  pipe(
    TE.tryCatch(
      async () => {
        return createContext()
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain((context) =>
      TE.tryCatch(
        () =>
          new Promise((resolve) => {
            const { pw, updatedEnvs } = getPreRequestScriptMethods(envs)

            // Expose pw to the context
            context.pw = pw

            // Run the test script in the provided context
            runInContext(preRequestScript, context)

            resolve(updatedEnvs)
          }),
        (reason) => `Script execution failed: ${reason}`
      )
    )
  )
