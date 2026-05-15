import {
  HoppCollection,
  HoppCollectionVariable,
  HoppRESTHeaders,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { Service } from "dioc"
import { hasActualScript } from "@hoppscotch/js-sandbox/scripting"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { nextTick, Ref } from "vue"
import {
  captureInitialEnvironmentState,
  runTestRunnerRequest,
} from "~/helpers/RequestRunner"
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
    options: TestRunnerOptions,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
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
      description: collection.description ?? null,
      preRequestScript: collection.preRequestScript ?? "",
      testScript: collection.testScript ?? "",
    }

    // Route through runTestsWithIterations so pm.setNextRequest, pm.iterationData,
    // and iteration dataset support are all reachable from the public entry point.
    this.runTestsWithIterations(
      tab,
      collection,
      options,
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
        // Only reset to "stopped" when the run ended normally or via a user-stop.
        // Preserve "error" status set in the catch() branch so callers and the UI
        // can distinguish unexpected failures from intentional stops.
        if (tab.value.document.status !== "error") {
          tab.value.document.status = "stopped"
        }
      })
  }

  private async runTestsWithIterations(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
  ) {
    const dataset = options.dataset
    const hasDataset =
      dataset?.enabled && dataset.data && dataset.data.length > 0

    // Always use the user's iteration value
    const iterations = options.iterations || 1

    for (let iteration = 0; iteration < iterations; iteration++) {
      if (options.stopRef?.value) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped")
      }

      // For iterations after the first, we don't reset the result collection
      // This allows us to accumulate results across iterations
      const shouldResetCollection = iteration === 0

      // Get current iteration data if dataset is enabled
      // If iteration exceeds dataset length, reuse the last dataset row
      let iterationData: any = undefined
      if (hasDataset && dataset.data) {
        const dataIndex = Math.min(iteration, dataset.data.length - 1)
        iterationData = dataset.data[dataIndex]
      }

      const executionOrder =
        options.requestOrder && options.requestOrder.length > 0
          ? options.requestOrder
          : this.collectRequestOrder(collection)

      await this.runTestsInCustomOrder(
        tab,
        collection,
        options,
        shouldResetCollection,
        executionOrder,
        iterationData,
        ancestorPreRequestScripts,
        ancestorTestScripts
      )

      // Add delay between iterations (except after the last one)
      if (iteration < iterations - 1 && options.delay && options.delay > 0) {
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

  private addRequestToPath(
    collection: HoppCollection,
    path: number[],
    request: TestRunnerRequest
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the request at the specified index
    if (path.length > 0) {
      current.requests[path[path.length - 1]] = request
    }
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
    inheritedVariables: HoppCollectionVariable[] = [],
    inheritedPreRequestScripts: string[] = [],
    inheritedTestScripts: string[] = [],
    iterationData?: Record<string, unknown>
  ): Promise<string | null | undefined> {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    try {
      // Update request status in the result collection
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        isLoading: true,
        error: undefined,
      })

      // Force Vue to flush DOM updates before starting async work.
      // This ensures components consuming the isLoading state (such as those rendering the Send/Cancel button) update immediately.
      // Performance impact: nextTick() waits for microtask queue drain (actual latency varies based on pending microtasks)
      // but is necessary to prevent UI flicker and ensure loading indicators appear before long-running network requests.
      await nextTick()

      // Capture the initial environment state for a test run so that it remains consistent and unchanged when current environment changes
      const initialEnvironmentState = captureInitialEnvironmentState()

      const results = await runTestRunnerRequest(
        request,
        options.keepVariableValues,
        inheritedVariables,
        initialEnvironmentState,
        inheritedPreRequestScripts,
        inheritedTestScripts,
        iterationData,
        options.iterations ?? 1
      )

      if (options.stopRef?.value) {
        throw new Error("Test execution stopped")
      }

      if (results && E.isRight(results)) {
        const { response, testResult, updatedRequest, nextRequest } =
          results.right
        const { passed, failed } = this.getTestResultInfo(testResult)

        tab.value.document.testRunnerMeta.totalTests += passed + failed
        tab.value.document.testRunnerMeta.passedTests += passed
        tab.value.document.testRunnerMeta.failedTests += failed

        // Update request with results and propagate pre-request script changes in the result collection
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          ...updatedRequest,
          testResults: testResult,
          response: options.persistResponses ? response : null,
          isLoading: false,
        })

        if (response.type === "success" || response.type === "fail") {
          tab.value.document.testRunnerMeta.totalTime +=
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests += 1
        }

        return nextRequest
      }
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

      return undefined
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

      return undefined
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

  /**
   * Resolves a string path (e.g. "folder_0/folder_1/request_2") to the actual
   * request plus its inherited auth, headers, and parent path array.
   */
  private resolveRequestContext(
    collection: HoppCollection,
    pathStr: string,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
  ): {
    request: TestRunnerRequest
    parentPath: number[]
    requestIndex: number
    inheritedAuth: HoppRESTRequest["auth"]
    inheritedHeaders: HoppRESTHeaders
    inheritedVariables: HoppCollectionVariable[]
    inheritedPreRequestScripts: string[]
    inheritedTestScripts: string[]
  } | null {
    const parts = pathStr.split("/")
    let current: HoppCollection = collection
    const parentPath: number[] = []

    // Start with root-level auth/headers
    let inheritedAuth: HoppRESTRequest["auth"] =
      collection.auth?.authType === "inherit"
        ? { authType: "none", authActive: false }
        : collection.auth || { authType: "none", authActive: false }

    let inheritedHeaders: HoppRESTHeaders = [...(collection.headers || [])]
    let inheritedVariables: HoppCollectionVariable[] = [
      ...(populateValuesInInheritedCollectionVars(
        collection.variables,
        collection._ref_id || collection.id
      ) || []),
    ]

    // Accumulate scripts from the collection root — prepend ancestor scripts first
    let inheritedPreRequestScripts: string[] = [
      ...ancestorPreRequestScripts,
      ...(hasActualScript(collection.preRequestScript)
        ? [collection.preRequestScript]
        : []),
    ]
    let inheritedTestScripts: string[] = [
      ...ancestorTestScripts,
      ...(hasActualScript(collection.testScript) ? [collection.testScript] : []),
    ]

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (part.startsWith("folder_")) {
        const folderIdx = parseInt(part.replace("folder_", ""), 10)
        if (isLast) return null // path ends in folder, not a request

        const folder = current.folders[folderIdx]
        if (!folder) return null

        // Accumulate auth/headers from this folder
        inheritedAuth =
          folder.auth?.authType === "inherit" && folder.auth?.authActive
            ? inheritedAuth
            : folder.auth || { authType: "none", authActive: false }

        inheritedHeaders = [...inheritedHeaders, ...(folder.headers || [])]
        inheritedVariables = [
          ...inheritedVariables,
          ...(populateValuesInInheritedCollectionVars(
            folder.variables,
            folder._ref_id || folder.id
          ) || []),
        ]

        // Accumulate scripts from this folder
        inheritedPreRequestScripts = [
          ...inheritedPreRequestScripts,
          ...(hasActualScript(folder.preRequestScript)
            ? [folder.preRequestScript]
            : []),
        ]
        inheritedTestScripts = [
          ...inheritedTestScripts,
          ...(hasActualScript(folder.testScript) ? [folder.testScript] : []),
        ]

        parentPath.push(folderIdx)
        current = folder as HoppCollection
      } else if (part.startsWith("request_")) {
        const reqIdx = parseInt(part.replace("request_", ""), 10)
        const request = current.requests[reqIdx]
        if (!request) return null

        return {
          request: request as TestRunnerRequest,
          parentPath,
          requestIndex: reqIdx,
          inheritedAuth,
          inheritedHeaders,
          inheritedVariables,
          inheritedPreRequestScripts,
          inheritedTestScripts,
        }
      } else {
        return null // unknown segment
      }
    }

    return null
  }

  /**
   * Pre-populates all folder nodes in the result collection from the source
   * collection. This is required before custom-order execution so that
   * appendRequestToPath / updateRequestAtPath can navigate into sub-folders.
   */
  private buildFolderSkeleton(
    resultCollection: HoppCollection,
    sourceCollection: HoppCollection,
    path: number[] = []
  ): void {
    sourceCollection.folders.forEach((folder, i) => {
      const folderPath = [...path, i]
      this.addFolderToPath(resultCollection, folderPath, {
        ...cloneDeep(folder),
        folders: [],
        requests: [],
      })
      this.buildFolderSkeleton(
        resultCollection,
        folder as HoppCollection,
        folderPath
      )
    })
  }

  /**
   * Executes requests in the user-defined flat order stored in options.requestOrder.
   * Auth/header inheritance is resolved for each request individually.
   */
  private async runTestsInCustomOrder(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    shouldResetFoldersAndRequests: boolean,
    executionOrder: string[],
    iterationData?: Record<string, unknown>,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = []
  ) {
    // On the first iteration, pre-populate the folder tree in the result collection
    // so that appendRequestToPath can navigate into sub-folders safely.
    if (shouldResetFoldersAndRequests) {
      this.buildFolderSkeleton(tab.value.document.resultCollection!, collection)
    }

    const folderRequestCounters = new Map<string, number>()

    let orderIndex = 0
    // Cycle detection: track how many setNextRequest jumps have occurred.
    // Prevents infinite loops when scripts create circular jump chains.
    const MAX_JUMPS = 100
    let jumpCount = 0

    while (orderIndex < executionOrder.length) {
      const requestPath = executionOrder[orderIndex]

      if (options.stopRef?.value) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped")
      }

      // Honour selection: skip deselected requests
      const shouldExecute = this.shouldExecuteRequest(
        requestPath,
        options.requestSelection
      )
      if (!shouldExecute) {
        orderIndex++
        continue
      }

      // Resolve the request and its inherited context (auth, headers, variables, scripts)
      const ctx = this.resolveRequestContext(
        collection,
        requestPath,
        ancestorPreRequestScripts,
        ancestorTestScripts
      )
      if (!ctx) {
        orderIndex++
        continue
      }

      const {
        request,
        parentPath,
        inheritedAuth,
        inheritedHeaders,
        inheritedVariables,
        inheritedPreRequestScripts,
        inheritedTestScripts,
      } = ctx

      // Use a sequential per-folder counter as the insertion index.
      const folderKey = parentPath.join("/")
      const seqIndex = folderRequestCounters.get(folderKey) ?? 0
      folderRequestCounters.set(folderKey, seqIndex + 1)

      const fullPath = [...parentPath, seqIndex]

      // Issue 1 fix: use addRequestToPath (appendRequestToPath does not exist)
      this.addRequestToPath(
        tab.value.document.resultCollection!,
        fullPath,
        cloneDeep(request)
      )

      // Apply inherited auth and headers
      const finalRequest: TestRunnerRequest = {
        ...request,
        auth:
          request.auth.authType === "inherit" && request.auth.authActive
            ? inheritedAuth
            : request.auth,
        headers: [...inheritedHeaders, ...request.headers],
      }

      // Issue 3 fix: pass inheritedPreRequestScripts and inheritedTestScripts correctly
      const nextRequest = await this.runTestRequest(
        tab,
        finalRequest,
        collection,
        options,
        fullPath,
        inheritedVariables,
        inheritedPreRequestScripts,
        inheritedTestScripts,
        iterationData
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

      if (nextRequest === null) {
        // pm.setNextRequest(null) — stop the run
        return
      }

      // pm.execution.skipRequest() sentinel — advance to the next request without stopping
      if (nextRequest === "__HOPP_SKIP_REQUEST__") {
        orderIndex++
        continue
      }

      if (typeof nextRequest === "string") {
        // Issue 4 fix: guard against infinite loops
        if (jumpCount >= MAX_JUMPS) {
          console.warn(
            `[TestRunner] pm.setNextRequest loop limit (${MAX_JUMPS}) reached — stopping run to prevent infinite loop.`
          )
          return
        }
        jumpCount++

        const nextRequestPath = this.resolveNextRequestPath(
          collection,
          nextRequest
        )

        if (nextRequestPath) {
          const nextIndex = executionOrder.indexOf(nextRequestPath)

          if (nextIndex !== -1) {
            orderIndex = nextIndex
            continue
          }
        }
      }

      orderIndex++
    }
  }

  private collectRequestOrder(
    collection: HoppCollection,
    parentPath: number[] = []
  ): string[] {
    const requestOrder: string[] = []

    // Process requests first so same-level requests execute before diving into sub-folders.
    // This matches the natural top-to-bottom reading order of the sidebar when requests
    // appear above (or alongside) folders at the same level.
    collection.requests.forEach((_, requestIndex) => {
      requestOrder.push(this.buildRequestPath(parentPath, requestIndex))
    })

    collection.folders.forEach((folder, folderIndex) => {
      requestOrder.push(
        ...this.collectRequestOrder(folder as HoppCollection, [
          ...parentPath,
          folderIndex,
        ])
      )
    })


    return requestOrder
  }

  private resolveNextRequestPath(
    collection: HoppCollection,
    target: string,
    parentPath: number[] = []
  ): string | null {
    for (
      let requestIndex = 0;
      requestIndex < collection.requests.length;
      requestIndex++
    ) {
      const request = collection.requests[requestIndex]

      const requestRefId =
        "_ref_id" in request && typeof request._ref_id === "string"
          ? request._ref_id
          : undefined

      if (
        request.name === target ||
        request.id === target ||
        requestRefId === target
      ) {
        return this.buildRequestPath(parentPath, requestIndex)
      }
    }

    for (
      let folderIndex = 0;
      folderIndex < collection.folders.length;
      folderIndex++
    ) {
      const resolvedPath = this.resolveNextRequestPath(
        collection.folders[folderIndex] as HoppCollection,
        target,
        [...parentPath, folderIndex]
      )

      if (resolvedPath) {
        return resolvedPath
      }
    }

    return null
  }

  /**
   * Builds a request path string from a path array
   * Example: [0, 1, 2] -> "folder_0/folder_1/request_2"
   */
  private buildRequestPath(parentPath: number[], requestIndex: number): string {
    const folderPath = parentPath.map((idx) => `folder_${idx}`).join("/")
    const requestPath = `request_${requestIndex}`
    return folderPath ? `${folderPath}/${requestPath}` : requestPath
  }

  /**
   * Checks if a request should be executed based on selection state
   * If no selection state is provided, all requests are executed
   */
  private shouldExecuteRequest(
    requestPath: string,
    selectionState?: Record<string, boolean>
  ): boolean {
    if (!selectionState || Object.keys(selectionState).length === 0) {
      return true // Execute all if no selection state
    }
    return selectionState[requestPath] ?? false
  }
}
