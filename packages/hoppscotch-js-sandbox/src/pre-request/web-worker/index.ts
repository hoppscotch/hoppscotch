import * as TE from "fp-ts/lib/TaskEither"
import { TestResult } from "~/types"

export const execPreRequestScriptForWeb = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> => {
  const worker = new Worker("./worker")

  const messageId = Date.now().toString()
  let result = {} as TE.TaskEither<string, TestResult["envs"]>

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
    preRequestScript,
    envs,
  })

  return result
}
