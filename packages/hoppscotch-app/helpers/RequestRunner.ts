import { Observable } from "rxjs"
import { filter } from "rxjs/operators"
import getEnvironmentVariablesFromScript from "./preRequest"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { createRESTNetworkRequestStream } from "./network"
import runTestScriptWithVariables, {
  transformResponseForTesting,
} from "./postwomanTesting"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { getRESTRequest, setRESTTestResults } from "~/newstore/RESTSession"

/**
 * Runs a REST network request along with all the
 * other side processes (like running test scripts)
 */
export function runRESTRequest$(): Observable<HoppRESTResponse> {
  const envs = getEnvironmentVariablesFromScript(
    getRESTRequest().preRequestScript
  )

  const effectiveRequest = getEffectiveRESTRequest(getRESTRequest(), {
    name: "Env",
    variables: Object.keys(envs).map((key) => {
      return {
        key,
        value: envs[key],
      }
    }),
  })

  const stream = createRESTNetworkRequestStream(effectiveRequest)

  // Run Test Script when request ran successfully
  const subscription = stream
    .pipe(filter((res) => res.type === "success"))
    .subscribe((res) => {
      const testReport: {
        report: "" // ¯\_(ツ)_/¯
        testResults: Array<
          | {
              result: "FAIL"
              message: string
              styles: { icon: "close"; class: "cl-error-response" }
            }
          | {
              result: "PASS"
              message: string
              styles: { icon: "check"; class: "success-response" }
            }
          | { startBlock: string; styles: { icon: ""; class: "" } }
          | { endBlock: true; styles: { icon: ""; class: "" } }
        >
        errors: [] // ¯\_(ツ)_/¯
      } = runTestScriptWithVariables(effectiveRequest.testScript, {
        response: transformResponseForTesting(res),
      }) as any

      setRESTTestResults(translateToNewTestResults(testReport))

      subscription.unsubscribe()
    })

  return stream
}

function isTestPass(x: any): x is {
  result: "PASS"
  styles: { icon: "check"; class: "success-response" }
} {
  return x.result !== undefined && x.result === "PASS"
}

function isTestFail(x: any): x is {
  result: "FAIL"
  message: string
  styles: { icon: "close"; class: "cl-error-response" }
} {
  return x.result !== undefined && x.result === "FAIL"
}

function isStartBlock(
  x: any
): x is { startBlock: string; styles: { icon: ""; class: "" } } {
  return x.startBlock !== undefined
}

function isEndBlock(
  x: any
): x is { endBlock: true; styles: { icon: ""; class: "" } } {
  return x.endBlock !== undefined
}

function translateToNewTestResults(testReport: {
  report: "" // ¯\_(ツ)_/¯
  testResults: Array<
    | {
        result: "FAIL"
        message: string
        styles: { icon: "close"; class: "cl-error-response" }
      }
    | {
        result: "PASS"
        message: string
        styles: { icon: "check"; class: "success-response" }
      }
    | { startBlock: string; styles: { icon: ""; class: "" } }
    | { endBlock: true; styles: { icon: ""; class: "" } }
  >
  errors: [] // ¯\_(ツ)_/¯
}): HoppTestResult {
  // Build a stack of test data which we eventually build up based on the results
  const testsStack: HoppTestData[] = [
    {
      description: "root",
      tests: [],
      expectResults: [],
    },
  ]

  testReport.testResults.forEach((result) => {
    // This is a test block start, push an empty test to the stack
    if (isStartBlock(result)) {
      testsStack.push({
        description: result.startBlock,
        tests: [],
        expectResults: [],
      })
    } else if (isEndBlock(result)) {
      // End of the block, pop the stack and add it as a child to the current stack top
      const testData = testsStack.pop()!
      testsStack[testsStack.length - 1].tests.push(testData)
    } else if (isTestPass(result)) {
      // A normal PASS expectation
      testsStack[testsStack.length - 1].expectResults.push({
        status: "pass",
        message: result.message,
      })
    } else if (isTestFail(result)) {
      // A normal FAIL expectation
      testsStack[testsStack.length - 1].expectResults.push({
        status: "fail",
        message: result.message,
      })
    }
  })

  // We should end up with only the root stack entry
  if (testsStack.length !== 1) throw new Error("Invalid test result structure")

  return {
    expectResults: testsStack[0].expectResults,
    tests: testsStack[0].tests,
  }
}
