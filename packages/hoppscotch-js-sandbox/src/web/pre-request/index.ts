import { FaradayCage } from "faraday-cage"
import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash"
import {
  RunPreRequestScriptOptions,
  SandboxPreRequestResult,
  TestResult,
} from "~/types"

import { defaultModules, preRequestModule } from "~/cage-modules"

import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import Worker from "./worker?worker&inline"

const runPreRequestScriptWithWebWorker = (
  preRequestScript: string,
  envs: TestResult["envs"],
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  return new Promise((resolve) => {
    const worker = new Worker()

    // Listen for messages from the web worker
    worker.addEventListener("message", (event: MessageEvent) => {
      const { type, results, level, args } = event.data

      if (type === "console") {
        // Forward console messages to the main thread console
        const logMethod = level as keyof typeof console
        if (typeof console[logMethod] === "function") {
          ;(console[logMethod] as any)(
            `[Pre-request Script ${level.toUpperCase()}]:`,
            ...args,
          )
        }
      } else if (results) {
        // This is the final result message
        worker.terminate()
        return resolve(results)
      }
    })

    // Send the script to the web worker
    worker.postMessage({
      preRequestScript,
      envs,
    })
  })
}

const runPreRequestScriptWithFaradayCage = async (
  preRequestScript: string,
  envs: TestResult["envs"] & {
    temp?: Array<{
      key: string
      currentValue: string
      initialValue: string
      secret: boolean
    }>
  },
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const consoleEntries: ConsoleEntry[] = []
  const tempEnvs = envs.temp || []
  let finalEnvs = envs
  let finalRequest = request
  let finalCookies = cookies

  let cage: any = null

  try {
    cage = await FaradayCage.create()

    // Set up a timeout to prevent hanging async operations
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Script execution timeout (10 seconds)"))
      }, 10000)
    })

    const executePromise = cage.runCode(preRequestScript, [
      ...defaultModules({
        handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
      }),

      preRequestModule({
        envs: cloneDeep(envs),
        request: cloneDeep(request),
        cookies: cookies ? cloneDeep(cookies) : null,
        handleSandboxResults: ({ envs, request, cookies }) => {
          finalEnvs = envs
          finalRequest = request
          finalCookies = cookies
        },
      }),
    ])

    // Race between execution and timeout
    const result = await Promise.race([executePromise, timeoutPromise])

    if (result.type === "error") {
      if (
        result.err !== null &&
        typeof result.err === "object" &&
        "message" in result.err
      ) {
        return E.left(`Script execution failed: ${result.err.message}`)
      }

      return E.left(`Script execution failed: ${String(result.err)}`)
    }

    return E.right({
      updatedEnvs: {
        ...finalEnvs,
        temp: tempEnvs, // Preserve the temp array
      },
      consoleEntries,
      updatedRequest: finalRequest,
      updatedCookies: finalCookies,
    } satisfies SandboxPreRequestResult)
  } catch (error) {
    // Handle any errors that occur during execution
    if (error instanceof Error) {
      return E.left(`Sandbox execution failed: ${error.message}`)
    }
    return E.left(`Sandbox execution failed: ${String(error)}`)
  } finally {
    // Ensure cage is cleaned up even if there's an error
    if (cage) {
      try {
        // Give more time for any pending async operations to complete
        // This is especially important for fetch promises that might still be resolving
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Try to clean up the cage if it has cleanup methods
        if (typeof cage.destroy === "function") {
          cage.destroy()
        } else if (typeof cage.dispose === "function") {
          cage.dispose()
        } else if (typeof cage.close === "function") {
          cage.close()
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup FaradayCage:", cleanupError)
      }
    }
  }
}

export const runPreRequestScript = (
  preRequestScript: string,
  options: RunPreRequestScriptOptions,
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const { envs, experimentalScriptingSandbox = true } = options

  // Check if script uses fetch - if so, use web worker to avoid QuickJS lifetime issues
  const usesFetch = preRequestScript.includes("fetch(")

  if (experimentalScriptingSandbox && !usesFetch) {
    const { request, cookies } = options as Extract<
      RunPreRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPreRequestScriptWithFaradayCage(
      preRequestScript,
      envs,
      request,
      cookies,
    )
  }

  // Use web worker for fetch operations or when experimental sandbox is disabled
  return runPreRequestScriptWithWebWorker(preRequestScript, envs)
}
