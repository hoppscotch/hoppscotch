/**
 * Web worker based implementation
 */

import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { cloneDeep } from "lodash-es"

import { TestResponse, TestResult } from "../../types"
import { getTestRunnerScriptMethods, preventCyclicObjects } from "../../utils"

const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
) => {
  try {
    // Create a function from the script using the Function constructor
    const scriptFunction = new Function(
      "pw",
      "marshalObject",
      "cloneDeep",
      "testRunStack",
      "envs",
      "response",
      `${testScript}`
    )

    // Marshal response object
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
    }

    const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

    // Expose pw and other dependencies to the script
    scriptFunction(
      { ...pw, response: responseObjHandle.right },
      preventCyclicObjects,
      cloneDeep,
      testRunStack,
      updatedEnvs,
      response
    )

    return TE.right({
      tests: testRunStack[0],
      envs: updatedEnvs,
    })
  } catch (error) {
    return TE.left(`Script execution failed: ${(error as Error).message}`)
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { messageId, testScript, envs, response } = event.data

  const result = await executeScriptInContext(testScript, envs, response)()

  // Post the result back to the main thread
  self.postMessage({ messageId, result })
})
