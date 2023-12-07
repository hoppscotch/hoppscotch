import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { createContext, runInContext } from "vm"

import { TestResponse, TestResult } from "~/types"
import { getTestRunnerScriptMethods, preventCyclicObjects } from "~/utils"

export const runTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, TestResult> =>
  pipe(
    TE.tryCatch(
      async () => {
        return createContext()
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain((context) =>
      TE.tryCatch(
        () => executeScriptInContext(testScript, envs, response, context),
        (reason) => `Script execution failed: ${reason}`
      )
    )
  )

const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  context: any
): Promise<TestResult> => {
  return new Promise((resolve, reject) => {
    // Parse response object
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return reject(`Response parsing failed: ${responseObjHandle.left}`)
    }

    const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

    // Expose pw to the context
    context.pw = { ...pw, response: responseObjHandle.right }

    // Run the test script in the provided context
    runInContext(testScript, context)

    resolve({
      tests: testRunStack,
      envs: updatedEnvs,
    })
  })
}
