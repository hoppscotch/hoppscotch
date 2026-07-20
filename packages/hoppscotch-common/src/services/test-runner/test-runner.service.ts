import {
  HoppCollection,
  HoppCollectionVariable,
  Environment,
  HoppRESTHeaders,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { Service } from "dioc"
import { hasActualScript } from "@hoppscotch/js-sandbox/scripting"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { Ref } from "vue"
import {
  captureInitialEnvironmentState,
  runTestRunnerRequest,
  type InitialEnvironmentState,
} from "~/helpers/RequestRunner"
import {
  HoppTestRunnerDocument,
  TestRunnerMeta,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppTab } from "../tab"
import { populateValuesInInheritedCollectionVars } from "~/helpers/utils/inheritedCollectionVarTransformer"
import { datasetRowToTempVars } from "~/helpers/runner/dataset"
import { getRequestSelectionID } from "~/helpers/runner/selection"
import { clearTemporaryVariables } from "~/helpers/runner/temp_envs"

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
  runnerRequestID?: string
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

  private createEmptyMeta(): TestRunnerMeta {
    return {
      totalRequests: 0,
      completedRequests: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalTime: 0,
    }
  }

  private createResultCollection(collection: HoppCollection): HoppCollection {
    return {
      v: collection.v,
      id: collection.id,
      name: collection.name,
      auth: collection.auth,
      headers: collection.headers,
      folders: [],
      requests: [],
      variables: [],
      description: collection.description ?? null,
      preRequestScript: collection.preRequestScript ?? "",
      testScript: collection.testScript ?? "",
    }
  }

  private shouldRunRequest(
    request: HoppRESTRequest,
    path: number[],
    selectedIDs: Set<string>,
    selectionActive: boolean
  ) {
    return (
      !selectionActive || selectedIDs.has(getRequestSelectionID(request, path))
    )
  }

  private collectionHasSelectedRequest(
    collection: HoppCollection,
    parentPath: number[],
    selectedIDs: Set<string>,
    selectionActive: boolean
  ): boolean {
    if (!selectionActive) return true

    return (
      collection.requests.some((request, index) =>
        this.shouldRunRequest(
          request as HoppRESTRequest,
          [...parentPath, index],
          selectedIDs,
          selectionActive
        )
      ) ||
      collection.folders.some((folder, index) =>
        this.collectionHasSelectedRequest(
          folder,
          [...parentPath, index],
          selectedIDs,
          selectionActive
        )
      )
    )
  }

  public runTests(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
  ) {
    // Reset the result collection
    tab.value.document.status = "running"
    tab.value.document.resultCollection = undefined
    tab.value.document.iterationResults = []
    tab.value.document.selectedIteration = 0
    tab.value.document.testRunnerMeta = this.createEmptyMeta()
    clearTemporaryVariables()

    const selectionActive = Array.isArray(
      tab.value.document.selectedRequestRefIds
    )
    const selectedIDs = new Set(tab.value.document.selectedRequestRefIds ?? [])
    const resolvedIterations = Math.max(1, Number(options.iterations) || 1)

    this.runTestIterations(
      tab,
      collection,
      options,
      resolvedIterations,
      selectedIDs,
      selectionActive,
      ancestorPreRequestScripts,
      ancestorTestScripts
    )
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
        if (tab.value.document.status !== "error") {
          tab.value.document.status = "stopped"
        }
      })
  }

  private async runTestIterations(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    resolvedIterations: number,
    selectedIDs: Set<string>,
    selectionActive: boolean,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
  ) {
    for (
      let iterationIndex = 0;
      iterationIndex < resolvedIterations;
      iterationIndex++
    ) {
      if (options.stopRef?.value) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped")
      }

      if (!options.keepVariableValues) clearTemporaryVariables()

      // When variable values are not persisted, the global/selected env stores
      // are never written back mid-iteration, so this snapshot is identical for
      // every request in the iteration and can be captured once. With
      // keepVariableValues on, scripts persist changes to the store between
      // requests, so each request must re-capture (left undefined here).
      const iterationEnvState = options.keepVariableValues
        ? undefined
        : captureInitialEnvironmentState()

      const resultCollection = this.createResultCollection(collection)
      const meta = this.createEmptyMeta()
      // The iteration count is normally locked to the dataset length by the UI,
      // so this clamp is defensive: if the two ever diverge (e.g. a persisted
      // state that keeps the count but has fewer rows), reuse the last row
      // rather than reading out of bounds.
      const iterationVars = options.dataset?.rows.length
        ? datasetRowToTempVars(
            options.dataset.rows[
              Math.min(iterationIndex, options.dataset.rows.length - 1)
            ]
          )
        : []

      tab.value.document.iterationResults?.push({
        iteration: iterationIndex + 1,
        resultCollection,
        meta,
      })
      tab.value.document.selectedIteration = iterationIndex
      tab.value.document.resultCollection = resultCollection

      await this.runTestCollection(
        tab,
        collection,
        options,
        selectedIDs,
        selectionActive,
        resultCollection,
        meta,
        iterationVars,
        [],
        [],
        undefined,
        undefined,
        [],
        undefined,
        ancestorPreRequestScripts,
        ancestorTestScripts,
        iterationEnvState
      )
    }
  }

  private async runTestCollection(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    selectedIDs: Set<string>,
    selectionActive: boolean,
    resultCollection: HoppCollection,
    iterationMeta: TestRunnerMeta,
    iterationVars: Environment["variables"],
    sourceParentPath: number[] = [],
    resultParentPath: number[] = [],
    parentHeaders?: HoppRESTHeaders,
    parentAuth?: HoppRESTRequest["auth"],
    parentVariables: HoppCollection["variables"] = [],
    parentID?: string,
    parentPreRequestScripts: string[] = [],
    parentTestScripts: string[] = [],
    iterationEnvState?: InitialEnvironmentState
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

      const inheritedPreRequestScripts = [
        ...parentPreRequestScripts,
        ...(hasActualScript(collection.preRequestScript)
          ? [collection.preRequestScript]
          : []),
      ]
      const inheritedTestScripts = [
        ...parentTestScripts,
        ...(hasActualScript(collection.testScript)
          ? [collection.testScript]
          : []),
      ]

      // Process folders progressively
      for (let i = 0; i < collection.folders.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const folder = collection.folders[i]
        const sourcePath = [...sourceParentPath, i]

        if (
          !this.collectionHasSelectedRequest(
            folder,
            sourcePath,
            selectedIDs,
            selectionActive
          )
        ) {
          continue
        }

        // Add folder to the result collection
        const resultFolderIndex = this.addFolderToPath(
          resultCollection,
          resultParentPath,
          {
            ...cloneDeep(folder),
            folders: [],
            requests: [],
          }
        )
        const resultPath = [...resultParentPath, resultFolderIndex]

        await this.runTestCollection(
          tab,
          folder,
          options,
          selectedIDs,
          selectionActive,
          resultCollection,
          iterationMeta,
          iterationVars,
          sourcePath,
          resultPath,
          inheritedHeaders,
          inheritedAuth,
          inheritedVariables,
          collection._ref_id || collection.id,
          inheritedPreRequestScripts,
          inheritedTestScripts,
          iterationEnvState
        )
      }

      // Process requests progressively
      for (let i = 0; i < collection.requests.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const request = collection.requests[i] as TestRunnerRequest
        const sourcePath = [...sourceParentPath, i]

        if (
          !this.shouldRunRequest(
            request,
            sourcePath,
            selectedIDs,
            selectionActive
          )
        ) {
          continue
        }

        // Add request to the result collection before execution
        const resultRequestIndex = this.addRequestToPath(
          resultCollection,
          resultParentPath,
          {
            ...cloneDeep(request),
            runnerRequestID: getRequestSelectionID(request, sourcePath),
            passedTests: 0,
            failedTests: 0,
          }
        )
        const resultPath = [...resultParentPath, resultRequestIndex]
        tab.value.document.testRunnerMeta.totalRequests += 1
        iterationMeta.totalRequests += 1

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
          resultPath,
          iterationMeta,
          iterationVars,
          inheritedVariables,
          inheritedPreRequestScripts,
          inheritedTestScripts,
          iterationEnvState
        )

        if (options.delay && options.delay > 0) {
          try {
            await delay(options.delay)
          } catch (_error) {
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
    parentPath: number[],
    folder: HoppCollection
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < parentPath.length; i++) {
      current = current.folders[parentPath[i]]
    }

    current.folders.push(folder)
    return current.folders.length - 1
  }

  private addRequestToPath(
    collection: HoppCollection,
    parentPath: number[],
    request: TestRunnerRequest
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < parentPath.length; i++) {
      current = current.folders[parentPath[i]]
    }

    current.requests.push(request)
    return current.requests.length - 1
  }

  private updateRequestAtPath(
    collection: HoppCollection,
    path: number[],
    updates: Partial<TestRunnerRequest>
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Update the request at the specified index
    if (path.length > 0) {
      const index = path[path.length - 1]
      current.requests[index] = {
        ...current.requests[index],
        ...updates,
      } as TestRunnerRequest
    }
  }

  private async runTestRequest(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    request: TestRunnerRequest,
    collection: HoppCollection,
    options: TestRunnerOptions,
    path: number[],
    iterationMeta: TestRunnerMeta,
    iterationVars: Environment["variables"],
    inheritedVariables: HoppCollectionVariable[] = [],
    inheritedPreRequestScripts: string[] = [],
    inheritedTestScripts: string[] = [],
    iterationEnvState?: InitialEnvironmentState
  ) {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    try {
      // Update request status in the result collection
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        isLoading: true,
        error: undefined,
      })

      // Reuse the per-iteration snapshot when variable values aren't persisted;
      // otherwise re-capture so this request sees env changes persisted by
      // earlier requests in the run. runTestRunnerRequest yields for a browser
      // paint before the network call, so the loading state still renders.
      const initialEnvironmentState =
        iterationEnvState ?? captureInitialEnvironmentState()

      const results = await runTestRunnerRequest(
        request,
        options.keepVariableValues,
        inheritedVariables,
        initialEnvironmentState,
        inheritedPreRequestScripts,
        inheritedTestScripts,
        iterationVars
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
        iterationMeta.totalTests += passed + failed
        iterationMeta.passedTests += passed
        iterationMeta.failedTests += failed

        // Update request with results and propagate pre-request script changes in the result collection
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          ...updatedRequest,
          testResults: testResult,
          passedTests: passed,
          failedTests: failed,
          response: options.persistResponses ? response : null,
          isLoading: false,
        })

        if (response.type === "success" || response.type === "fail") {
          tab.value.document.testRunnerMeta.totalTime +=
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests += 1
          iterationMeta.totalTime += response.meta.responseDuration
          iterationMeta.completedRequests += 1
        }
      } else {
        const errorMsg = "Request execution failed"

        // Update request with error in the result collection
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          error: errorMsg,
          isLoading: false,
          response: {
            type: "network_fail",
            error: "Unknown",
            req: request,
          },
        })

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
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        error: errorMsg,
        isLoading: false,
      })

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
