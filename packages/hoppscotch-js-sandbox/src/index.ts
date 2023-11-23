import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import {
  TestResult,
  TestDescriptor as _TestDescriptor,
  TestResponse as _TestResponse,
} from "./types"

export type TestResponse = _TestResponse
export type TestDescriptor = _TestDescriptor
export type SandboxTestResult = TestResult & { tests: TestDescriptor }

let runTestScriptForWeb,
  runPreRequestScriptForWeb,
  runPreRequestScriptForNode,
  runTestScriptForNode

if (typeof Worker !== "undefined") {
  /**
   * Executes a given test script on the test-runner sandbox
   * @param testScript The string of the script to run
   * @returns A TaskEither with an error message or a TestDescriptor with the final status
   */
  runTestScriptForWeb = async (
    testScript: string,
    envs: TestResult["envs"],
    response: TestResponse
  ) => {
    const { execTestScriptForWeb } = await import("./test-runner/web-worker")
    return pipe(
      execTestScriptForWeb(testScript, envs, response),
      TE.chain((results) =>
        TE.right(<SandboxTestResult>{
          envs: results.envs,
          tests: results.tests[0],
        })
      ) // execTestScript returns an array of descriptors with a single element (extract that)
    )
  }

  runPreRequestScriptForWeb = () => ({})
} else {
  /**
   * Executes a given pre-request script on the sandbox
   * @param preRequestScript The script to run
   * @param env The environment variables active
   * @returns A TaskEither with an error message or an array of the final environments with the all the script values applied
   */
  runPreRequestScriptForNode = import("./pre-request/node-vm").then(
    ({ execPreRequestScriptForNode }) => execPreRequestScriptForNode
  )

  runTestScriptForNode = import("./test-runner/node-vm").then(
    ({ execTestScriptForNode }) => execTestScriptForNode
  )
}

export {
  runPreRequestScriptForNode,
  runPreRequestScriptForWeb,
  runTestScriptForNode,
  runTestScriptForWeb,
}
