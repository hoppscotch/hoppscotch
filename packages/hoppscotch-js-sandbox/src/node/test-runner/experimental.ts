import { HoppRESTRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, postRequestModule } from "~/cage-modules"
import {
  HoppFetchHook,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"
import { acquireCage, resetCage, isInfraError } from "~/utils/cage"

/**
 * Runs a post-request/test script on the given cage instance.
 * Returns the result or "retry" if a bootstrap error triggered a cage reset.
 */
const executeTestOnCage = async (
  cage: Awaited<ReturnType<typeof acquireCage>>,
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: TestResponse,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, TestResult> | "retry"> => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  let finalEnvs = envs
  let finalTestResults = testRunStack
  const testPromises: Promise<void>[] = []

  const captureHook: { capture?: () => void; bootstrapError?: unknown } = {}

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

  if (result.type === "error") {
    const bootstrapFailed = captureHook.bootstrapError !== undefined
    const errorToAnalyze = bootstrapFailed
      ? captureHook.bootstrapError
      : result.err

    if (bootstrapFailed || isInfraError(errorToAnalyze)) {
      resetCage()
      return "retry"
    }

    if (
      result.err !== null &&
      typeof result.err === "object" &&
      "message" in result.err
    ) {
      const name =
        "name" in result.err && typeof result.err.name === "string"
          ? result.err.name
          : ""
      const prefix = name ? `${name}: ` : ""
      return E.left(`Script execution failed: ${prefix}${result.err.message}`)
    }

    return E.left(`Script execution failed: ${String(result.err)}`)
  }

  // Execute tests sequentially to support dependent tests that share variables.
  if (testPromises.length > 0) {
    for (let i = 0; i < testPromises.length; i++) {
      await testPromises[i]
    }
  }

  if (captureHook.capture) {
    captureHook.capture()
  }

  // Check for uncaught runtime errors (ReferenceError, TypeError, etc.) in test callbacks.
  // These should fail the entire test run, NOT be reported as testcases.
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
    return E.left(`Script execution failed: ${runtimeErrors[0].message}`)
  }

  const safeTestResults = cloneDeep(finalTestResults)
  const safeEnvs = cloneDeep(finalEnvs)

  return E.right({
    tests: safeTestResults,
    envs: safeEnvs,
  })
}

export const runPostRequestScriptWithFaradayCage = (
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: TestResponse,
  hoppFetchHook?: HoppFetchHook
): TE.TaskEither<string, TestResult> => {
  return () =>
    (async () => {
      try {
        const cage = await acquireCage()

        const firstAttempt = await executeTestOnCage(
          cage,
          testScript,
          envs,
          request,
          response,
          hoppFetchHook
        )

        if (firstAttempt !== "retry") {
          return firstAttempt
        }

        // Bootstrap error detected and cage was reset — retry once on a fresh cage
        const freshCage = await acquireCage()
        const retryResult = await executeTestOnCage(
          freshCage,
          testScript,
          envs,
          request,
          response,
          hoppFetchHook
        )

        if (retryResult === "retry") {
          return E.left(
            "Script execution failed: sandbox initialization error (persistent)"
          )
        }

        return retryResult
      } catch (error) {
        const name =
          error instanceof Error && error.name ? `${error.name}: ` : ""
        const message = error instanceof Error ? error.message : String(error)
        return E.left(`Script execution failed: ${name}${message}`)
      }
    })()
}
