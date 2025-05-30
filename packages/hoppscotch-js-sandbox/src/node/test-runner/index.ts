import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

import { preventCyclicObjects } from "~/shared-utils"
import { TestResponse, TestResult } from "~/types"
import { runTestScriptWithFaradayCage } from "./experimental"
import { runTestScriptWithIsolatedVm } from "./legacy"

export const runTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  experimentalScriptingSandbox = true
): TE.TaskEither<string, TestResult> => {
  const responseObjHandle = preventCyclicObjects<TestResponse>(response)

  if (E.isLeft(responseObjHandle)) {
    return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  return experimentalScriptingSandbox
    ? runTestScriptWithFaradayCage(testScript, envs, responseObjHandle.right)
    : runTestScriptWithIsolatedVm(testScript, envs, responseObjHandle.right)
}
