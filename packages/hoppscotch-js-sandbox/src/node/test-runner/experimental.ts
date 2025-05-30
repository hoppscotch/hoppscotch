import { FaradayCage } from "faraday-cage"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { cloneDeep } from "lodash"

import { defaultModules, pwPostRequestModule } from "~/cage-modules"
import { TestDescriptor, TestResponse, TestResult } from "~/types"

export const runTestScriptWithFaradayCage = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, TestResult> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<TestResult> => {
        const testRunStack: TestDescriptor[] = [
          { descriptor: "root", expectResults: [], children: [] },
        ]

        let finalEnvs = envs
        let finalTestResults = testRunStack

        const cage = await FaradayCage.create()

        const result = await cage.runCode(testScript, [
          ...defaultModules(),

          pwPostRequestModule({
            envs: cloneDeep(envs),
            testRunStack: cloneDeep(testRunStack),
            response,
            handleSandboxResults: ({ envs, testRunStack }) => {
              finalEnvs = envs
              finalTestResults = testRunStack
            },
          }),
        ])

        if (result.type === "error") {
          throw result.err
        }

        return {
          tests: finalTestResults,
          envs: finalEnvs,
        }
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
