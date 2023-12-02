import { TestResult } from "~/types"

import Worker from "./worker?worker&inline"

export const execPreRequestScriptForWeb = (
  preRequestScript: string,
  envs: TestResult["envs"]
) =>
  new Promise((resolve) => {
    const worker = new Worker()

    const messageId = Date.now().toString()

    // Listen for the result from the web worker
    worker.addEventListener("message", (event: MessageEvent) => {
      if (event.data.messageId === messageId) {
        if (event.data.result) {
          return resolve(event.data.result)
        }
        return resolve(event.data.result)
      }
    })

    // Send the script to the web worker
    worker.postMessage({
      messageId,
      preRequestScript,
      envs,
    })
  })
