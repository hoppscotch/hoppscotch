import { HoppRESTRequest } from "@hoppscotch/data"
import { FaradayCage } from "faraday-cage"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { cloneDeep } from "lodash"

import { defaultModules, postRequestModule } from "~/cage-modules"
import { TestDescriptor, TestResponse, TestResult } from "~/types"

export const runPostRequestScriptWithFaradayCage = (
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
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

          postRequestModule({
            envs: cloneDeep(envs),
            testRunStack: cloneDeep(testRunStack),
            request: cloneDeep(request),
            response: cloneDeep(response),
            // TODO: Post type update, accommodate for cookies although platform support is limited
            cookies: null,
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
