import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { Ref } from "vue"
import { runTestRunnerRequest } from "~/helpers/RequestRunner"
import {
  HoppTestRunnerDocument,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppTab } from "../tab"

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

export type TestRunnerRequest = HoppRESTRequest & {
  type: "test-response"
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
  isLoading?: boolean
  error?: string
  renderResults?: boolean
}

function delay(timeMS: number) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, timeMS)
    return () => {
      clearTimeout(timeout)
      reject(new Error("Operation cancelled"))
    }
  })
}

export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  public runTests(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    tab.value.document.status = "running"
    tab.value.document.resultCollection = cloneDeep(collection)

    this.runTestCollection(tab, tab.value.document.resultCollection, options)
      .then(() => {
        tab.value.document.status = "stopped"
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message === "Test execution stopped"
        ) {
          tab.value.document.status = "stopped"
        } else {
          tab.value.document.status = "error"
          console.error("Test runner failed:", error)
        }
      })
      .finally(() => {
        tab.value.document.status = "stopped"
      })
  }

  private async runTestCollection(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    try {
      for (const folder of collection.folders) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }
        await this.runTestCollection(tab, folder, options)
      }

      for (const request of collection.requests) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }
        await this.runTestRequest(
          tab,
          request as TestRunnerRequest,
          collection,
          options
        )

        if (options.delay && options.delay > 0) {
          try {
            await delay(options.delay)
          } catch (error) {
            if (options.stopRef?.value) {
              tab.value.document.status = "stopped"
              throw new Error("Test execution stopped")
            }
          }
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Test execution stopped"
      ) {
        throw error // Propagate stop signal
      }
      tab.value.document.status = "error"
      console.error("Collection execution failed:", error)
      throw error // Re-throw to propagate error
    }
  }

  private async runTestRequest(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    request: TestRunnerRequest,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    try {
      request.isLoading = true
      request.error = undefined

      const results = await runTestRunnerRequest(request)

      // Check again after the request in case it was stopped during execution
      if (options.stopRef?.value) {
        throw new Error("Test execution stopped")
      }

      if (results && E.isRight(results)) {
        const { response, testResult } = results.right

        const { passed, failed } = this.getTestResultInfo(testResult)
        console.log("Test results:", { passed, failed })

        tab.value.document.testRunnerMeta.totalTests =
          tab.value.document.testRunnerMeta.totalTests + 1
        tab.value.document.testRunnerMeta.passedTests =
          tab.value.document.testRunnerMeta.passedTests + passed
        tab.value.document.testRunnerMeta.failedTests =
          tab.value.document.testRunnerMeta.failedTests + failed

        request.testResults = testResult
        request.response = response

        if (response.type === "success" || response.type === "fail") {
          tab.value.document.testRunnerMeta.totalTime =
            tab.value.document.testRunnerMeta.totalTime +
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests =
            tab.value.document.testRunnerMeta.completedRequests + 1
        }
      } else {
        const errorMsg = "Request execution failed"
        request.error = errorMsg

        // Stop the test run if stopOnError is true
        if (options.stopOnError) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped due to error")
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Test execution stopped"
      ) {
        throw error // Re-throw stop signal
      }

      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred"
      request.error = errorMsg

      // Stop the test run if stopOnError is true
      if (options.stopOnError) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped due to error")
      }
    } finally {
      request.isLoading = false
    }
  }

  private getTestResultInfo(testResult: HoppTestData) {
    // Initialize counters for this level of recursion
    let passed = 0
    let failed = 0

    // Count results at the current test level
    for (const result of testResult.expectResults) {
      if (result.status === "pass") {
        passed++
      } else if (result.status === "fail") {
        failed++
      }
    }

    // Recursively check nested tests and accumulate their results
    for (const nestedTest of testResult.tests) {
      const nestedResult = this.getTestResultInfo(nestedTest)
      passed += nestedResult.passed
      failed += nestedResult.failed
    }

    return { passed, failed }
  }
}
