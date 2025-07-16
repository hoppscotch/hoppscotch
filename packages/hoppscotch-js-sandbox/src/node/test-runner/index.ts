import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { RunPostRequestScriptOptions, TestResponse, TestResult } from "~/types"
import { preventCyclicObjects } from "~/utils/shared"
import { runPostRequestScriptWithFaradayCage } from "./experimental"
import { runPostRequestScriptWithIsolatedVm } from "./legacy"

// TODO: Update return type to be based on `SandboxTestResult`
// No involvement of cookies in the CLI context currently
export const runTestScript = (
  testScript: string,
  options: RunPostRequestScriptOptions
): TE.TaskEither<string, TestResult> => {
  const responseObjHandle = preventCyclicObjects<TestResponse>(options.response)

  if (E.isLeft(responseObjHandle)) {
    return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  const resolvedResonse = responseObjHandle.right
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
      resolvedResonse
    )
  }

  return runPostRequestScriptWithIsolatedVm(testScript, envs, resolvedResonse)
}
