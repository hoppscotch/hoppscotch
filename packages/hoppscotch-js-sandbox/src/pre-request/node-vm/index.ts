import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"
import { createContext, runInContext } from "vm"

import { TestResult } from "~/types"

// Todo: Investigate why path alias doesn't work for `utils`
import { getPreRequestScriptMethods } from "../../utils"

export const runPreRequestScript = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> =>
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
            const { pw, updatedEnvs } = getPreRequestScriptMethods(
              cloneDeep(envs)
            )

            // Expose pw to the context
            context.pw = pw

            // Run the pre-request script in the provided context
            runInContext(preRequestScript, context)

            resolve(updatedEnvs)
          }),
        (reason) => `Script execution failed: ${reason}`
      )
    )
  )