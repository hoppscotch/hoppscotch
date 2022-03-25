import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { execPreRequestScript } from "./preRequest"
import {
  execTestScript,
  TestResponse,
  TestDescriptor as _TestDescriptor,
  TestResult,
} from "./test-runner"

export type TestDescriptor = _TestDescriptor
export type SandboxTestResult = TestResult & { tests: TestDescriptor }

/**
 * Executes a given test script on the test-runner sandbox
 * @param testScript The string of the script to run
 * @returns A TaskEither with an error message or a TestDescriptor with the final status
 */
export const runTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
) =>
  pipe(
    execTestScript(testScript, envs, response),
    TE.chain((results) =>
      TE.right(<SandboxTestResult>{
        envs: results.envs,
        tests: results.tests[0],
      })
    ) // execTestScript returns an array of descriptors with a single element (extract that)
  )

/**
 * Executes a given pre-request script on the sandbox
 * @param preRequestScript The script to run
 * @param env The environment variables active
 * @returns A TaskEither with an error message or an array of the final environments with the all the script values applied
 */
export const runPreRequestScript = execPreRequestScript
