import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"

import { defaultModules, postRequestModule } from "~/cage-modules"
import {
  HoppFetchHook,
  RunPostRequestScriptOptions,
  SandboxTestResult,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"
import { acquireCage, resetCage, isInfraError } from "~/utils/cage"
import { preventCyclicObjects } from "~/utils/shared"

import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import Worker from "./worker?worker&inline"

const runPostRequestScriptWithWebWorker = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): Promise<E.Either<string, SandboxTestResult>> => {
  return new Promise((resolve) => {
    const worker = new Worker()

    // Listen for the results from the web worker
    worker.addEventListener("message", (event: MessageEvent) =>
      resolve(event.data.results)
    )

    // Send the script to the web worker
    worker.postMessage({
      testScript,
      envs,
      response,
    })
  })
}

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
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxTestResult> | "retry"> => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  let finalEnvs = envs
  let finalTestResults = testRunStack
  const consoleEntries: ConsoleEntry[] = []
  let finalCookies = cookies
  const testPromises: Promise<void>[] = []

  const captureHook: { capture?: () => void; bootstrapError?: unknown } = {}

  const result = await cage.runCode(testScript, [
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
      hoppFetchHook,
    }),

    postRequestModule(
      {
        envs: cloneDeep(envs),
        testRunStack: cloneDeep(testRunStack),
        request: cloneDeep(request),
        response: cloneDeep(response),
        cookies: cookies ? cloneDeep(cookies) : null,
        handleSandboxResults: ({ envs, testRunStack, cookies }) => {
          finalEnvs = envs
          finalTestResults = testRunStack
          finalCookies = cookies
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

  // Wait for async test functions before capturing results.
  if (testPromises.length > 0) {
    await Promise.all(testPromises)
  }

  if (captureHook.capture) {
    captureHook.capture()
  }

  const safeTestResults = cloneDeep(finalTestResults[0])

  const safeEnvs = cloneDeep(finalEnvs)
  const safeConsoleEntries = cloneDeep(consoleEntries)
  const safeCookies = finalCookies ? cloneDeep(finalCookies) : null

  return E.right({
    tests: safeTestResults,
    envs: safeEnvs,
    consoleEntries: safeConsoleEntries,
    updatedCookies: safeCookies,
  } satisfies SandboxTestResult)
}

const runPostRequestScriptWithFaradayCage = async (
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: TestResponse,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxTestResult>> => {
  try {
    const cage = await acquireCage()

    const firstAttempt = await executeTestOnCage(
      cage,
      testScript,
      envs,
      request,
      response,
      cookies,
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
      cookies,
      hoppFetchHook
    )

    if (retryResult === "retry") {
      return E.left(
        "Script execution failed: sandbox initialization error (persistent)"
      )
    }

    return retryResult
  } catch (error) {
    const name = error instanceof Error && error.name ? `${error.name}: ` : ""
    const message = error instanceof Error ? error.message : String(error)
    return E.left(`Script execution failed: ${name}${message}`)
  }
}

export const runTestScript = async (
  testScript: string,
  options: RunPostRequestScriptOptions
): Promise<E.Either<string, SandboxTestResult>> => {
  // Pre-parse the script to catch syntax errors before execution
  // Use AsyncFunction to support top-level await (required for hopp.fetch, etc.)
  try {
    // eslint-disable-next-line no-new-func
    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor
    new (AsyncFunction as any)(testScript)
  } catch (e) {
    const err = e as Error
    const reason = `${"name" in err ? (err as any).name : "SyntaxError"}: ${err.message}`
    return E.left(`Script execution failed: ${reason}`)
  }

  const responseObjHandle = preventCyclicObjects<TestResponse>(options.response)

  if (E.isLeft(responseObjHandle)) {
    return E.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  const resolvedResponse = responseObjHandle.right

  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, cookies, hoppFetchHook } = options as Extract<
      RunPostRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPostRequestScriptWithFaradayCage(
      testScript,
      envs,
      request,
      resolvedResponse,
      cookies,
      hoppFetchHook
    )
  }

  return runPostRequestScriptWithWebWorker(testScript, envs, resolvedResponse)
}
