import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { SandboxTestResult, TestResponse, TestResult } from "~/types"
import {
  getTestRunnerScriptMethods,
  preventCyclicObjects,
} from "~/utils/shared"

const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
): TE.TaskEither<string, SandboxTestResult> => {
  return TE.tryCatch(
    async () => {
      const responseObjHandle = preventCyclicObjects(response)
      if (E.isLeft(responseObjHandle)) {
        throw new Error(
          `Response marshalling failed: ${responseObjHandle.left}`,
        )
      }

      const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

      // Create a console proxy that forwards logs to the main thread
      const proxyConsole = {
        log: (...args: any[]) => {
          self.postMessage({
            type: "console",
            level: "log",
            args,
          })
        },
        info: (...args: any[]) => {
          self.postMessage({
            type: "console",
            level: "info",
            args,
          })
        },
        warn: (...args: any[]) => {
          self.postMessage({
            type: "console",
            level: "warn",
            args,
          })
        },
        error: (...args: any[]) => {
          self.postMessage({
            type: "console",
            level: "error",
            args,
          })
        },
        debug: (...args: any[]) => {
          self.postMessage({
            type: "console",
            level: "debug",
            args,
          })
        },
      }

      // Clean the script to remove any export/import statements
      const cleanedScript = testScript
        .replace(/^\s*export\s+.*$/gm, "") // Remove export statements
        .replace(/^\s*import\s+.*$/gm, "") // Remove import statements
        .trim()

      // Set up globals BEFORE executing the user's script
      ;(globalThis as any).pw = { ...pw, response: responseObjHandle.right }
      ;(globalThis as any).console = proxyConsole
      ;(globalThis as any).fetch = self.fetch
        ? self.fetch.bind(self)
        : globalThis.fetch

      // Also set on self for redundancy
      ;(self as any).pw = { ...pw, response: responseObjHandle.right }
      ;(self as any).console = proxyConsole
      ;(self as any).fetch = self.fetch
        ? self.fetch.bind(self)
        : globalThis.fetch

      // Execute the user's script using Function constructor
      // Remove trailing semicolon to avoid syntax errors when using 'return'
      const scriptToExecute = cleanedScript.trim().replace(/;$/, "")
      const scriptFunction = new Function(`return ${scriptToExecute}`)
      const scriptResult = scriptFunction()

      // If the script returns a promise (e.g., from an async IIFE), wait for it
      if (scriptResult && typeof scriptResult.then === "function") {
        await scriptResult
      }

      return <SandboxTestResult>{
        tests: testRunStack[0],
        envs: updatedEnvs,
      }
    },
    (error) => {
      const errorMessage = (error as Error).message

      // Provide more helpful error messages for common issues
      if (errorMessage.includes("export")) {
        return `Script execution failed: ES6 module syntax (export/import) is not supported in test scripts. Please use regular JavaScript.`
      }
      if (errorMessage.includes("import")) {
        return `Script execution failed: ES6 module syntax (export/import) is not supported in test scripts. Please use regular JavaScript.`
      }

      return `Script execution failed: ${errorMessage}`
    },
  )
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { testScript, envs, response } = event.data

  const results = await executeScriptInContext(testScript, envs, response)()

  // Post the result back to the main thread
  self.postMessage({ results })
})
