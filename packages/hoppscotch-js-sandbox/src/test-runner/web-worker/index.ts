import * as TE from "fp-ts/TaskEither"

import { TestResponse, TestResult } from "../../types"
import { SandboxTestResult } from "~/index"

export const execTestScriptForWeb = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, SandboxTestResult> => {
  const worker = new Worker("./worker.ts")

  const messageId = Date.now().toString()

  let result = {} as TE.TaskEither<string, SandboxTestResult>

  // Listen for the result from the web worker
  worker.addEventListener("message", (event) => {
    if (event.data.messageId === messageId) {
      if (event.data.result) {
        result = TE.right(event.data.result)
      } else {
        result = TE.left(event.data.result)
      }
    }
  })

  // Send the script to the web worker
  worker.postMessage({
    messageId,
    testScript,
    envs,
    response,
  })

  return result
}
