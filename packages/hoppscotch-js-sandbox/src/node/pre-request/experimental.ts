import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, preRequestModule } from "~/cage-modules"
import { HoppFetchHook, SandboxPreRequestResult, TestResult } from "~/types"
import { acquireCage, resetCage, isInfraError } from "~/utils/cage"

/**
 * Runs a pre-request script on the given cage instance.
 * Returns the result or "retry" if a bootstrap error triggered a cage reset.
 */
const executePreRequestOnCage = async (
  cage: Awaited<ReturnType<typeof acquireCage>>,
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxPreRequestResult> | "retry"> => {
  let finalEnvs = envs
  let finalRequest = request
  let finalCookies = cookies

  const captureHook: { capture?: () => void; bootstrapError?: unknown } = {}

  const result = await cage.runCode(preRequestScript, [
    ...defaultModules({
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
    updatedRequest: finalRequest,
    updatedCookies: finalCookies,
  })
}

export const runPreRequestScriptWithFaradayCage = (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): TE.TaskEither<string, SandboxPreRequestResult> => {
  return () =>
    (async () => {
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
