import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { createPwModule, preventCyclicObjects } from "~/shared-utils"
import { SandboxTestResult, TestResponse, TestResult } from "~/types"

import asyncWasmLocation from "@jitl/quickjs-wasmfile-release-asyncify/wasm?url"

import { FaradayCage } from "faraday-cage"
import {
  blobPolyfill,
  console as consoleModule,
  esmModuleLoader,
} from "faraday-cage/modules"

const executeScriptInContext = async (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
): Promise<TE.TaskEither<string, SandboxTestResult>> => {
  try {
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
    }

    const cage = await FaradayCage.createFromQJSWasmLocation(asyncWasmLocation)

    const { pw, getTestRunStack, getUpdatedEnvs } = createPwModule(envs)

    cage.runCode(testScript, [
      pw,
      blobPolyfill,
      esmModuleLoader,
      consoleModule({
        onLog(...args) {
          console.log(...args)
        },
      }),
    ])

    const testRunStack = getTestRunStack()
    const updatedEnvs = getUpdatedEnvs()

    return TE.right(<SandboxTestResult>{
      tests: testRunStack[0],
      envs: updatedEnvs,
    })
  } catch (error) {
    return TE.left(`Script execution failed: ${(error as Error).message}`)
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { testScript, envs, response } = event.data

  const results = await (
    await executeScriptInContext(testScript, envs, response)
  )()

  // Post the result back to the main thread
  self.postMessage({ results })
})
