import * as TE from "fp-ts/lib/TaskEither"
import { TestResult } from "~/types"

export const execPreRequestScriptForWeb = (
  preRequestScript: string,
  envs: TestResult["envs"]
) =>
  new Promise((resolve) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })

    console.log(`workerUrl is`, new URL("./worker.ts", import.meta.url))

    const messageId = Date.now().toString()

    // Listen for the result from the web worker
    worker.addEventListener("message", (event) => {
      if (event.data.messageId === messageId) {
        if (event.data.result) {
          return resolve(TE.right(event.data.result))
        }
        return resolve(TE.left(event.data.result))
      }
    })

    // Send the script to the web worker
    try {
      worker.postMessage({
        messageId,
        preRequestScript,
        envs,
      })
      console.log("Sent message to web worker", preRequestScript, envs)
    } catch (err) {
      console.error(
        "Sending message to worker failed " + (err as Error).message
      )
      resolve(TE.left("Sending message to worker failed"))
    }
  })
