import { FaradayCage } from "faraday-cage"
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

const runPreRequestScriptWithFaradayCage = async (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const consoleEntries: ConsoleEntry[] = []
  let finalEnvs = envs
  let finalRequest = request
  let finalCookies = cookies

  const cage = await FaradayCage.create()

  try {
    // Create a hook object to receive the capture function from the module
    const captureHook: { capture?: () => void } = {}

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
      if (
        result.err !== null &&
        typeof result.err === "object" &&
        "message" in result.err
      ) {
        return E.left(`Script execution failed: ${result.err.message}`)
      }

      return E.left(`Script execution failed: ${String(result.err)}`)
    }

    // Capture results only on successful execution
    if (captureHook.capture) {
      captureHook.capture()
    }

    return E.right({
      updatedEnvs: finalEnvs,
      consoleEntries,
      updatedRequest: finalRequest,
      updatedCookies: finalCookies,
    } satisfies SandboxPreRequestResult)
  } finally {
    // Don't dispose cage here - returned objects may still be accessed.
    // Rely on garbage collection for cleanup.
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
