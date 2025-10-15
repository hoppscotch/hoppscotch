import {
  HoppCollection,
  HoppCollectionVariable,
  HoppRESTHeaders,
  HoppRESTRequest,
} from "@hoppscotch/data"
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
import { populateValuesInInheritedCollectionVars } from "~/helpers/utils/inheritedCollectionVarTransformer"

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
  passedTests: number
  failedTests: number
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
    // Reset the result collection
    tab.value.document.status = "running"
    tab.value.document.resultCollection = {
      v: collection.v,
      id: collection.id,
      name: collection.name,
      auth: collection.auth,
      headers: collection.headers,
      folders: [],
      requests: [],
      variables: [],
    }

    this.runTestsWithIterations(tab, collection, options)
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

  private async runTestsWithIterations(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    const iterations = options.iterations || 1

    for (let iteration = 0; iteration < iterations; iteration++) {
      if (options.stopRef?.value) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped")
      }

      // For iterations after the first, we don't reset the result collection
      // This allows us to accumulate results across iterations
      const shouldResetCollection = iteration === 0

      // Run the collection for this iteration
      await this.runTestCollection(
        tab,
        collection,
        options,
        [],
        undefined,
        undefined,
        [],
        undefined,
        shouldResetCollection
      )

      // Add delay between iterations (except after the last one)
      if (iteration < iterations - 1 && options.delay && options.delay > 0) {
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
  }

  private async runTestCollection(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    parentPath: number[] = [],
    parentHeaders?: HoppRESTHeaders,
    parentAuth?: HoppRESTRequest["auth"],
    parentVariables: HoppCollection["variables"] = [],
    parentID?: string,
    shouldResetFoldersAndRequests: boolean = false
  ) {
    try {
      // Compute inherited auth and headers for this collection
      const inheritedAuth =
        collection.auth?.authType === "inherit" && collection.auth.authActive
          ? parentAuth || { authType: "none", authActive: false }
          : collection.auth || { authType: "none", authActive: false }

      const inheritedHeaders: HoppRESTHeaders = [
        ...(parentHeaders || []),
        ...collection.headers,
      ]

      const inheritedVariables = [
        ...(populateValuesInInheritedCollectionVars(
          parentVariables,
          parentID || collection._ref_id || collection.id
        ) || []),
        ...(populateValuesInInheritedCollectionVars(
          collection.variables,
          collection._ref_id || collection.id
        ) || []),
      ]

      // Process folders progressively
      for (let i = 0; i < collection.folders.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const folder = collection.folders[i]
        const currentPath = [...parentPath, i]

        // Add folder to the result collection only on first iteration
        if (shouldResetFoldersAndRequests) {
          this.addFolderToPath(
            tab.value.document.resultCollection!,
            currentPath,
            {
              ...cloneDeep(folder),
              folders: [],
              requests: [],
            }
          )
        }

        // Pass inherited headers and auth to the folder
        await this.runTestCollection(
          tab,
          folder,
          options,
          currentPath,
          inheritedHeaders,
          inheritedAuth,
          inheritedVariables,
          collection._ref_id || collection.id,
          shouldResetFoldersAndRequests
        )
      }

      // Process requests progressively
      for (let i = 0; i < collection.requests.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const request = collection.requests[i] as TestRunnerRequest
        const currentPath = [...parentPath, i]

        // Add request to the result collection - appending for iterations
        this.appendRequestToPath(
          tab.value.document.resultCollection!,
          currentPath,
          cloneDeep(request),
          shouldResetFoldersAndRequests
        )

        // Update the request with inherited headers and auth before execution
        const finalRequest = {
          ...request,
          auth:
            request.auth.authType === "inherit" && request.auth.authActive
              ? inheritedAuth
              : request.auth,
          headers: [...inheritedHeaders, ...request.headers],
        }

        await this.runTestRequest(
          tab,
          finalRequest,
          collection,
          options,
          currentPath,
          inheritedVariables,
          shouldResetFoldersAndRequests
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
        throw error
      }
      tab.value.document.status = "error"
      console.error("Collection execution failed:", error)
      throw error
    }
  }

  private addFolderToPath(
    collection: HoppCollection,
    path: number[],
    folder: HoppCollection
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the folder at the specified index
    if (path.length > 0) {
      current.folders[path[path.length - 1]] = folder
    }
  }

  private appendRequestToPath(
    collection: HoppCollection,
    path: number[],
    request: TestRunnerRequest,
    shouldReplaceAtIndex: boolean = false
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add or append the request
    if (path.length > 0) {
      const index = path[path.length - 1]
      if (shouldReplaceAtIndex) {
        // First iteration: set at index
        current.requests[index] = request
      } else {
        // Subsequent iterations: append
        current.requests.push(request)
      }
    }
  }

  private updateRequestAtPath(
    collection: HoppCollection,
    path: number[],
    updates: Partial<TestRunnerRequest>,
    isAppendMode: boolean = false
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Update the request
    if (path.length > 0) {
      const index = path[path.length - 1]
      if (isAppendMode) {
        // In append mode, update the last request in the array
        const lastIndex = current.requests.length - 1
        current.requests[lastIndex] = {
          ...current.requests[lastIndex],
          ...updates,
        } as TestRunnerRequest
      } else {
        // Normal mode: update at the specified index
        current.requests[index] = {
          ...current.requests[index],
          ...updates,
        } as TestRunnerRequest
      }
    }
  }

  private async runTestRequest(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    request: TestRunnerRequest,
    collection: HoppCollection,
    options: TestRunnerOptions,
    path: number[],
    inheritedVariables: HoppCollectionVariable[] = [],
    isFirstIteration: boolean = true
  ) {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    const isAppendMode = !isFirstIteration

    try {
      // Update request status in the result collection
      this.updateRequestAtPath(
        tab.value.document.resultCollection!,
        path,
        {
          isLoading: true,
          error: undefined,
        },
        isAppendMode
      )

      const results = await runTestRunnerRequest(
        request,
        options.keepVariableValues,
        inheritedVariables
      )

      if (options.stopRef?.value) {
        throw new Error("Test execution stopped")
      }

      if (results && E.isRight(results)) {
        const { response, testResult, updatedRequest } = results.right
        const { passed, failed } = this.getTestResultInfo(testResult)

        tab.value.document.testRunnerMeta.totalTests += passed + failed
        tab.value.document.testRunnerMeta.passedTests += passed
        tab.value.document.testRunnerMeta.failedTests += failed

        // Update request with results and propagate pre-request script changes in the result collection
        this.updateRequestAtPath(
          tab.value.document.resultCollection!,
          path,
          {
            ...updatedRequest,
            testResults: testResult,
            response: options.persistResponses ? response : null,
            isLoading: false,
          },
          isAppendMode
        )

        if (response.type === "success" || response.type === "fail") {
          tab.value.document.testRunnerMeta.totalTime +=
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests += 1
        }
      } else {
        const errorMsg = "Request execution failed"

        // Update request with error in the result collection
        this.updateRequestAtPath(
          tab.value.document.resultCollection!,
          path,
          {
            error: errorMsg,
            isLoading: false,
            response: {
              type: "network_fail",
              error: "Unknown",
              req: request,
            },
          },
          isAppendMode
        )

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
        throw error
      }

      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred"

      // Update request with error in the result collection
      this.updateRequestAtPath(
        tab.value.document.resultCollection!,
        path,
        {
          error: errorMsg,
          isLoading: false,
        },
        isAppendMode
      )

      if (options.stopOnError) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped due to error")
      }
    }
  }

  private getTestResultInfo(testResult: HoppTestData) {
    let passed = 0
    let failed = 0

    for (const result of testResult.expectResults) {
      if (result.status === "pass") {
        passed++
      } else if (result.status === "fail") {
        failed++
      }
    }

    for (const nestedTest of testResult.tests) {
      const nestedResult = this.getTestResultInfo(nestedTest)
      passed += nestedResult.passed
      failed += nestedResult.failed
    }

    return { passed, failed }
  }
}
