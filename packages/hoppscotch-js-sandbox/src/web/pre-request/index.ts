import { FaradayCage } from "faraday-cage"
import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"
import { SandboxPreRequestResult, TestResult } from "~/types"

import { defaultModules, pwPreRequestModule } from "~/cage-modules"

import Worker from "./worker?worker&inline"

export const runPreRequestScript = async (
  preRequestScript: string,
  envs: TestResult["envs"],
  experimentalScriptingSandbox = true,
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const consoleEntries: ConsoleEntry[] = []
  let finalEnvs = envs

  if (!experimentalScriptingSandbox) {
    return new Promise((resolve) => {
      const worker = new Worker()

      // Listen for the results from the web worker
      worker.addEventListener("message", (event: MessageEvent) =>
        resolve(event.data.results),
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
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
    }),
    pwPreRequestModule({
      envs: cloneDeep(envs),
      handleSandboxResults: ({ envs }) => (finalEnvs = envs),
    }),
  ])

  if (result.type === "error") {
    if (
      result.err !== null &&
      typeof result.err === "object" &&
      "message" in result.err
    ) {
      return TE.left(`Script execution failed: ${result.err.message}`)()
    }

    return TE.left(`Script execution failed: ${String(result.err)}`)()
  }

  return TE.right({
    envs: finalEnvs,
    consoleEntries,
  })()
}
