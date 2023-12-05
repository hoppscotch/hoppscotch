import * as TE from "fp-ts/TaskEither"
import { cloneDeep } from "lodash-es"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "../../utils"

const executeScriptInContext = (
  preRequestScript: string,
  envs: TestResult["envs"]
) => {
  try {
    // Create a function from the script using the Function constructor
    const scriptFunction = new Function(
      "pw",
      "cloneDeep",
      "envs",
      preRequestScript
    )

    const { pw, updatedEnvs } = getPreRequestScriptMethods(envs)

    // Expose pw and other dependencies to the script
    scriptFunction(pw, cloneDeep, updatedEnvs)

    return TE.right(updatedEnvs)
  } catch (error) {
    return TE.left("Script execution failed: " + (error as Error).message)
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { messageId, preRequestScript, envs } = event.data

  const result = await executeScriptInContext(preRequestScript, envs)()

  // Post the result back to the main thread
  self.postMessage({ messageId, result })
})
