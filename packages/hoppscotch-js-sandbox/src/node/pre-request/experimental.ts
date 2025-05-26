import { FaradayCage } from "faraday-cage"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, pwPreRequestModule } from "~/cage-modules"
import { TestResult } from "~/types"

export const runPreRequestScriptWithFaradayCage = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<TestResult["envs"]> => {
        let finalEnvs = envs

        const cage = await FaradayCage.create()

        const result = await cage.runCode(preRequestScript, [
          ...defaultModules(),

          pwPreRequestModule({
            envs: cloneDeep(envs),
            handleSandboxResults: ({ envs }) => {
              finalEnvs = envs
            },
          }),
        ])

        if (result.type === "error") {
          throw result.err
        }

        return finalEnvs
      },
      (error) => {
        if (error !== null && typeof error === "object" && "message" in error) {
          const reason = `${"name" in error ? error.name : ""}: ${error.message}`
          return `Script execution failed: ${reason}`
        }

        return `Script execution failed: ${String(error)}`
      }
    )
  )
}
