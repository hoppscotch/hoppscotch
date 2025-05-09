import { TestResponse, TestResult } from "@hoppscotch/js-sandbox"
import { runTestScript } from "@hoppscotch/js-sandbox/web"

const executeScriptInSandbox = async (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
) => {
  const results = await runTestScript(testScript, envs, response)
  return results
}

self.onmessage = async (event) => {
  const { testScript, envs, response } = event.data

  const results = await executeScriptInSandbox(testScript, envs, response)

  // Post the result back to the main thread
  self.postMessage({ results })
}
