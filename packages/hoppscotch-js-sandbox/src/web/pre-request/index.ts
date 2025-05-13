import * as E from "fp-ts/Either"

import { SandboxPreRequestResult, TestResult } from "~/types"

import { FaradayCage } from "faraday-cage"
import {
  blobPolyfill,
  ConsoleEntry,
  console as ConsoleModule,
  crypto,
  esmModuleLoader,
  fetch,
} from "faraday-cage/modules"
import { cloneDeep } from "lodash"

import * as TE from "fp-ts/lib/TaskEither"
import { pwPreRequestModule } from "~/cage-modules/pw"

import Worker from "./worker?worker&inline"

export const runPreRequestScript = async (
  preRequestScript: string,
  envs: TestResult["envs"],
  experimentalScriptingSandbox = true
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const consoleEntries: ConsoleEntry[] = []
  let finalEnvs = envs

  if (!experimentalScriptingSandbox) {
    return new Promise((resolve) => {
      const worker = new Worker()

      // Listen for the results from the web worker
      worker.addEventListener("message", (event: MessageEvent) =>
        resolve(event.data.results)
      )

      // Send the script to the web worker
      worker.postMessage({
        preRequestScript,
        envs,
      })
    })
  }

  const cage = await FaradayCage.create()

  const result = await cage.runCode(preRequestScript, [
    pwPreRequestModule({
      envs: cloneDeep(envs),
      handleSandboxResults: ({ envs }) => {
        finalEnvs = envs
      },
    }),
    blobPolyfill,
    ConsoleModule({
      onLog(...args) {
        console[args[0]](...args)
      },
      onCount(...args) {
        console.count(args[0])
      },
      onTime(...args) {
        console.timeEnd(args[0])
      },
      onTimeLog(...args) {
        console.timeLog(...args)
      },
      onGroup(...args) {
        console.group(...args)
      },
      onGroupEnd(...args) {
        console.groupEnd(...args)
      },
      onClear(...args) {
        console.clear(...args)
      },
      onAssert(...args) {
        console.assert(...args)
      },
      onDir(...args) {
        console.dir(...args)
      },
      onTable(...args) {
        console.table(...args)
      },
      onFinish(entries) {
        consoleEntries.push(...entries)
      },
    }),
    crypto(),
    esmModuleLoader,
    fetch(),
    esmModuleLoader,
  ])

  if (result.type === "error") {
    if (
      result.err !== null &&
      typeof result.err === "object" &&
      "message" in result.err
    ) {
      return TE.left(`Script execution failed: ${result.err.message}`)()
    }

    throw TE.left(`Script execution failed: ${String(result.err)}`)()
  }

  return TE.right({
    envs: finalEnvs,
    consoleEntries,
  })()
}
