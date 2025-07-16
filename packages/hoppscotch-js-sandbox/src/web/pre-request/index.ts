import { FaradayCage } from "faraday-cage"
import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash"
import {
  RunPreRequestScriptOptions,
  SandboxPreRequestResult,
  TestResult,
} from "~/types"

import { defaultModules, pwPreRequestModule } from "~/cage-modules"

import { HoppRESTRequest } from "@hoppscotch/data"
import Worker from "./worker?worker&inline"

const runPreRequestScriptWithWebWorker = (
  preRequestScript: string,
  envs: TestResult["envs"],
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
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const consoleEntries: ConsoleEntry[] = []
  let finalEnvs = envs
  let finalRequest = request

  const cage = await FaradayCage.create()

  const result = await cage.runCode(preRequestScript, [
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
    }),

    pwPreRequestModule({
      envs: cloneDeep(envs),
      request: cloneDeep(request),
      handleSandboxResults: ({ envs, request }) => {
        finalEnvs = envs
        finalRequest = request
      },
    }),
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

  return E.right({
    updatedEnvs: finalEnvs,
    consoleEntries,
    updatedRequest: finalRequest,
  } satisfies SandboxPreRequestResult)
}

export const runPreRequestScript = async (
  preRequestScript: string,
  options: RunPreRequestScriptOptions,
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request } = options as Extract<
      RunPreRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPreRequestScriptWithFaradayCage(preRequestScript, envs, request)
  }

  return runPreRequestScriptWithWebWorker(preRequestScript, envs)
}
