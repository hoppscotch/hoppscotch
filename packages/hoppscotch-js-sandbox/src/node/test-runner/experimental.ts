import { HoppRESTRequest } from "@hoppscotch/data"
import { FaradayCage } from "faraday-cage"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { cloneDeep } from "lodash"

import { defaultModules, postRequestModule } from "~/cage-modules"
import {
  HoppFetchHook,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"

export const runPostRequestScriptWithFaradayCage = (
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: TestResponse,
  hoppFetchHook?: HoppFetchHook
): TE.TaskEither<string, TestResult> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<TestResult> => {
        const testRunStack: TestDescriptor[] = [
          { descriptor: "root", expectResults: [], children: [] },
        ]

        let finalEnvs = envs
        let finalTestResults = testRunStack
        const testPromises: Promise<void>[] = []

        const cage = await FaradayCage.create()

        // Wrap entire execution in try-catch to handle QuickJS GC errors that can occur at any point
        try {
          const captureHook: { capture?: () => void } = {}

          const result = await cage.runCode(testScript, [
            ...defaultModules({
              hoppFetchHook,
            }),
            postRequestModule(
              {
                envs: cloneDeep(envs),
                testRunStack: cloneDeep(testRunStack),
                request: cloneDeep(request),
                response: cloneDeep(response),
                // TODO: Post type update, accommodate for cookies although platform support is limited
                cookies: null,
                handleSandboxResults: ({ envs, testRunStack }) => {
                  finalEnvs = envs
                  finalTestResults = testRunStack
                },
                onTestPromise: (promise) => {
                  testPromises.push(promise)
                },
              },
              captureHook
            ),
          ])

          // Check for script execution errors first
          if (result.type === "error") {
            // Just throw the error - it will be wrapped by the TaskEither error handler
            throw result.err
          }

          // Execute tests sequentially to support dependent tests that share variables.
          // Concurrent execution would cause race conditions when tests rely on values
          // from earlier tests (e.g., authToken set in one test, used in another).
          if (testPromises.length > 0) {
            // Execute each test promise one at a time, waiting for completion
            for (let i = 0; i < testPromises.length; i++) {
              await testPromises[i]
            }
          }

          // Capture results AFTER all async tests complete
          // This prevents showing intermediate/failed state
          if (captureHook.capture) {
            captureHook.capture()
          }

          // Check for uncaught runtime errors (ReferenceError, TypeError, etc.) in test callbacks
          // These should fail the entire test run, NOT be reported as testcases
          // Validation errors (invalid assertion arguments) don't have "Error:" prefix - they're descriptive
          // Examples: "Expected toHaveLength to be called for an array or string"
          const runtimeErrors = finalTestResults
            .flatMap((t) => t.children)
            .flatMap((child) => child.expectResults || [])
            .filter(
              (r) =>
                r.status === "error" &&
                /^(ReferenceError|TypeError|SyntaxError|RangeError|URIError|EvalError|AggregateError|InternalError|Error):/.test(
                  r.message
                )
            )

          if (runtimeErrors.length > 0) {
            // Throw the runtime error directly (message already contains error type)
            throw runtimeErrors[0].message
          }

          // Deep clone results to break connection to QuickJS runtime objects,
          // preventing GC errors when runtime is freed.
          const safeTestResults = cloneDeep(finalTestResults)
          const safeEnvs = cloneDeep(finalEnvs)

          return {
            tests: safeTestResults,
            envs: safeEnvs,
          }
        } finally {
          // Don't dispose cage here - returned objects may still be accessed.
          // Rely on garbage collection for cleanup.
        }
      },
      (error) => {
        if (error !== null && typeof error === "object" && "message" in error) {
          const reason = `${"name" in error ? error.name : ""}: ${error.message}`
          return `Script execution failed: ${reason}`
        }

        return `Script execution failed: ${String(error)}`
      }
    )
  )
}
