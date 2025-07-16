import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { RunPostRequestScriptOptions, TestResponse, TestResult } from "~/types"
import { preventCyclicObjects } from "~/utils/shared"
import { runPostRequestScriptWithFaradayCage } from "./experimental"
import { runPostRequestScriptWithIsolatedVm } from "./legacy"

// Future TODO: Update return type to be based on `SandboxTestResult` (unified with the web implementation)
// No involvement of cookies in the CLI context currently
export const runTestScript = (
  testScript: string,
  options: RunPostRequestScriptOptions
): TE.TaskEither<string, TestResult> => {
  const responseObjHandle = preventCyclicObjects<TestResponse>(options.response)

  if (E.isLeft(responseObjHandle)) {
    return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  const resolvedResponse = responseObjHandle.right
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request } = options as Extract<
      RunPostRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPostRequestScriptWithFaradayCage(
      testScript,
      envs,
      request,
      resolvedResponse
    )
  }

  return runPostRequestScriptWithIsolatedVm(testScript, envs, resolvedResponse)
}
