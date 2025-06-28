import { FaradayCage } from "faraday-cage"
import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"

import { defaultModules, pwPostRequestModule } from "~/cage-modules"
import { preventCyclicObjects } from "~/shared-utils"
import {
  SandboxTestResult,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"

import Worker from "./worker?worker&inline"

const runTestScriptWithWebWorker = (
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

const runTestScriptWithFaradayCage = async (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): Promise<E.Either<string, SandboxTestResult>> => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  let finalEnvs = envs
  let finalTestResults = testRunStack
  const consoleEntries: ConsoleEntry[] = []

  const cage = await FaradayCage.create()

  const result = await cage.runCode(testScript, [
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
    }),

    pwPostRequestModule({
      envs: cloneDeep(envs),
      testRunStack: cloneDeep(testRunStack),
      response,
      handleSandboxResults: ({ envs, testRunStack }) => {
        finalEnvs = envs
        finalTestResults = testRunStack
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

  return E.right(<SandboxTestResult>{
    tests: finalTestResults[0],
    envs: finalEnvs,
    consoleEntries,
  })
}

export const runTestScript = async (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  experimentalScriptingSandbox = true
): Promise<E.Either<string, SandboxTestResult>> => {
  const responseObjHandle = preventCyclicObjects<TestResponse>(response)

  if (E.isLeft(responseObjHandle)) {
    return E.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  return experimentalScriptingSandbox
    ? runTestScriptWithFaradayCage(testScript, envs, responseObjHandle.right)
    : runTestScriptWithWebWorker(testScript, envs, responseObjHandle.right)
}
