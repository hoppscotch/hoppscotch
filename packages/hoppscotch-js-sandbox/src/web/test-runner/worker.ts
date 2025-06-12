import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import {
  getTestRunnerScriptMethods,
  preventCyclicObjects,
} from "~/shared-utils"
import { SandboxTestResult, TestResponse, TestResult } from "~/types"

const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, SandboxTestResult> => {
  try {
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
    }

    const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

    // Create a function from the test script using the `Function` constructor
    const executeScript = new Function("pw", testScript)

    // Execute the script
    executeScript({ ...pw, response: responseObjHandle.right })

    return TE.right(<SandboxTestResult>{
      tests: testRunStack[0],
      envs: updatedEnvs,
    })
  } catch (error) {
    return TE.left(`Script execution failed: ${(error as Error).message}`)
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { testScript, envs, response } = event.data

  const results = await executeScriptInContext(testScript, envs, response)()

  // Post the result back to the main thread
  self.postMessage({ results })
})
