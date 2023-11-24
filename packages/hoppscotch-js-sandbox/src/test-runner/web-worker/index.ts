import * as TE from "fp-ts/TaskEither"

import { TestResponse, TestResult } from "../../types"
import { SandboxTestResult } from "~/index"

export const execTestScriptForWeb = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): Promise<TE.TaskEither<string, SandboxTestResult>> => {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })

    const messageId = Date.now().toString()

    // Listen for the result from the web worker
    worker.addEventListener("message", (event) => {
      if (event.data.messageId === messageId) {
        if (event.data.result) {
          resolve(TE.right(event.data.result))
        } else {
          resolve(TE.left(event.data.result))
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
  })
}
