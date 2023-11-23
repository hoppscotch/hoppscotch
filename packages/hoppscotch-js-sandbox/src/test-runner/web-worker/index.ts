import * as TE from "fp-ts/TaskEither"

import { TestResponse, TestResult } from "../../types"

const worker = new Worker("worker.ts")

export const execTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
) =>
  new Promise((resolve) => {
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
