import { FaradayCage } from "faraday-cage"
import { ConsoleEntry } from "faraday-cage/modules"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"

import { defaultModules, postRequestModule } from "~/cage-modules"
import {
  RunPostRequestScriptOptions,
  SandboxTestResult,
  TestDescriptor,
  TestResponse,
  TestResult,
} from "~/types"
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

const runPostRequestScriptWithFaradayCage = async (
  testScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: TestResponse,
  cookies: Cookie[] | null
): Promise<E.Either<string, SandboxTestResult>> => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  let finalEnvs = envs
  let finalTestResults = testRunStack
  const consoleEntries: ConsoleEntry[] = []
  let finalCookies = cookies

  const cage = await FaradayCage.create()

  const result = await cage.runCode(testScript, [
    ...defaultModules({
      handleConsoleEntry: (consoleEntry) => consoleEntries.push(consoleEntry),
    }),

    postRequestModule({
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
    updatedCookies: finalCookies,
  })
}

export const runTestScript = async (
  testScript: string,
  options: RunPostRequestScriptOptions
): Promise<E.Either<string, SandboxTestResult>> => {
  const responseObjHandle = preventCyclicObjects<TestResponse>(options.response)

  if (E.isLeft(responseObjHandle)) {
    return E.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  const resolvedResponse = responseObjHandle.right

  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, cookies } = options as Extract<
      RunPostRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPostRequestScriptWithFaradayCage(
      testScript,
      envs,
      request,
      resolvedResponse,
      cookies
    )
  }

  return runPostRequestScriptWithWebWorker(testScript, envs, resolvedResponse)
}
