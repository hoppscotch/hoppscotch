import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash"
import {
  HoppFetchHook,
  RunPreRequestScriptOptions,
  SandboxPreRequestResult,
  TestResult,
} from "~/types"

import { defaultModules, preRequestModule } from "~/cage-modules"
import { acquireCage, resetCage, isInfraError } from "~/utils/cage"

import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import Worker from "./worker?worker&inline"

const runPreRequestScriptWithWebWorker = (
  preRequestScript: string,
  envs: TestResult["envs"]
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  return new Promise((resolve) => {
    const worker = new Worker()

    // Listen for the results from the web worker
    worker.addEventListener("message", (event: MessageEvent) => {
      worker.terminate()
      return resolve(event.data.results)
    })

    // Send the script to the web worker
    worker.postMessage({
      preRequestScript,
      envs,
    })
  })
}

/**
 * Runs a pre-request script on the given cage instance.
 * Returns the result (`Either<string, SandboxPreRequestResult>`) or the string literal "retry"
 * if a bootstrap error triggered a cage reset (caller should retry).
 */
const executePreRequestOnCage = async (
  cage: Awaited<ReturnType<typeof acquireCage>>,
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxPreRequestResult> | "retry"> => {
  const consoleEntries: ConsoleEntry[] = []
  let finalEnvs = envs
  let finalRequest = request
  let finalCookies = cookies

  const captureHook: { capture?: () => void; bootstrapError?: unknown } = {}

  const result = await cage.runCode(preRequestScript, [
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
      hoppFetchHook,
    }),

    preRequestModule(
      {
        envs: cloneDeep(envs),
        request: cloneDeep(request),
        cookies: cookies ? cloneDeep(cookies) : null,
        handleSandboxResults: ({ envs, request, cookies }) => {
          finalEnvs = envs
          finalRequest = request
          finalCookies = cookies
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

  if (captureHook.capture) {
    captureHook.capture()
  }

  return E.right({
    updatedEnvs: finalEnvs,
    consoleEntries,
    updatedRequest: finalRequest,
    updatedCookies: finalCookies,
  } satisfies SandboxPreRequestResult)
}

const runPreRequestScriptWithFaradayCage = async (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  try {
    const cage = await acquireCage()

    const firstAttempt = await executePreRequestOnCage(
      cage,
      preRequestScript,
      envs,
      request,
      cookies,
      hoppFetchHook
    )

    if (firstAttempt !== "retry") {
      return firstAttempt
    }

    // Bootstrap error detected and cage was reset — retry once on a fresh cage
    const freshCage = await acquireCage()
    const retryResult = await executePreRequestOnCage(
      freshCage,
      preRequestScript,
      envs,
      request,
      cookies,
      hoppFetchHook
    )

    if (retryResult === "retry") {
      // Two consecutive bootstrap failures — don't loop, report the error
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

export const runPreRequestScript = (
  preRequestScript: string,
  options: RunPreRequestScriptOptions
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, cookies, hoppFetchHook } = options as Extract<
      RunPreRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPreRequestScriptWithFaradayCage(
      preRequestScript,
      envs,
      request,
      cookies,
      hoppFetchHook
    )
  }

  return runPreRequestScriptWithWebWorker(preRequestScript, envs)
}
