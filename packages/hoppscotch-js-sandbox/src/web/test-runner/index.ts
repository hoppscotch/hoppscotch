import * as E from "fp-ts/Either"

import {
  SandboxTestResult,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"

import {
  blobPolyfill,
  ConsoleEntry,
  console as ConsoleModule,
  crypto,
  esmModuleLoader,
  fetch,
} from "faraday-cage/modules"

import { FaradayCage } from "faraday-cage"

import * as TE from "fp-ts/lib/TaskEither"

import { cloneDeep } from "lodash-es"
import { pwPostRequestModule } from "~/cage-modules/pw"
import { preventCyclicObjects } from "~/shared-utils"

import Worker from "./worker?worker&inline"

export const runTestScript = async (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  experimentalScriptingSandbox = true
): Promise<E.Either<string, SandboxTestResult>> => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  let finalEnvs = envs
  let finalTestResults = testRunStack
  const consoleEntries: ConsoleEntry[] = []

  const responseObjHandle = preventCyclicObjects(response)

  if (E.isLeft(responseObjHandle)) {
    return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)()
  }

  if (!experimentalScriptingSandbox) {
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

  const cage = await FaradayCage.create()

  const result = await cage.runCode(testScript, [
    pwPostRequestModule({
      envs: cloneDeep(envs),
      testRunStack: cloneDeep(testRunStack),
      response: responseObjHandle.right as TestResponse,
      handleSandboxResults: ({ envs, testRunStack }) => {
        finalEnvs = envs
        finalTestResults = testRunStack
      },
    }),
    blobPolyfill,
    ConsoleModule({
      onLog(...args) {
        console[args[0]](...args.slice(1))
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
  ])

  if (result.type === "error") {
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
  }

  return TE.right(<SandboxTestResult>{
    tests: finalTestResults[0],
    envs: finalEnvs,
    consoleEntries,
  })()
}
