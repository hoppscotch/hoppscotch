import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { SandboxTestResult, TestResponse, TestResult } from "~/types"

import asyncWasmLocation from "@jitl/quickjs-wasmfile-release-asyncify?url"
import { FaradayCage } from "faraday-cage"
import {
  blobPolyfill,
  console as ConsoleModule,
  esmModuleLoader,
} from "faraday-cage/modules"
import { getTestRunnerScriptMethods } from "~/shared-utils"

export const runTestScript = async (
  _testScript: string,
  envs: TestResult["envs"],
  _response: TestResponse,
): Promise<E.Either<string, SandboxTestResult>> => {
  const cage = await FaradayCage.create()
  await cage.runCode(
    `
    console.log('Hello from the sandbox!')
      import isEven from "https://esm.sh/is-even"

      console.log(isEven(1))
    `,
    [
      blobPolyfill,
      esmModuleLoader,
      ConsoleModule({
        // onLog(...args) {
        //   console.log(...args)
        // },
      }),
    ],
  )

  const { testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

  return TE.right(<SandboxTestResult>{
    tests: testRunStack[0],
    envs: updatedEnvs,
  })()
}
