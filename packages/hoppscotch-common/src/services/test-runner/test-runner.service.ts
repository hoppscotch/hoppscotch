import {
  HoppCollection,
  HoppCollectionVariable,
  Environment,
  HoppGQLRequest,
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
  type InitialEnvironmentState,
} from "~/helpers/RequestRunner"
import { runTestRunnerGQLRequest } from "~/helpers/graphql/testRunner"
import { isGQLRequest } from "~/helpers/request-type"
import {
  HoppTestRunnerDocument,
  TestRunnerMeta,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppTab } from "../tab"
import { resolveInheritedVariables } from "~/helpers/utils/inheritedCollectionVarTransformer"
import { datasetRowToTempVars } from "~/helpers/runner/dataset"
import {
  applyRunOrder,
  getRequestSelectionID,
} from "~/helpers/runner/selection"
import { clearTemporaryVariables } from "~/helpers/runner/temp_envs"

// Sentinel errors that unwind the runner: "Test execution stopped" is a user
// cancel, "…stopped due to error" a stop-on-error halt. Both are normal
// terminations, so unwinding catches must recognize either form.
const STOP_SIGNAL_PREFIX = "Test execution stopped"
const isStopSignal = (error: unknown): error is Error =>
  error instanceof Error && error.message.startsWith(STOP_SIGNAL_PREFIX)

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

/**
 * One request resolved against its ancestry and bound to its slot in the
 * result tree.
 */
type PlannedRequest = {
  /** Selection ID — how the run sequence refers to this request. */
  id: string
  request: TestRunnerRequest
  /** Owning collection/folder, for the test-script context. */
  collection: HoppCollection
  /** Folder names from the run root down to this request's parent. */
  folderPath: string[]
  inheritedVariables: HoppCollectionVariable[]
  inheritedPreRequestScripts: string[]
  inheritedTestScripts: string[]
  /** Kept unmerged for GQL requests — their executor slots auth headers
   * between request and inherited headers itself. */
  inheritedHeaders: HoppRESTHeaders
}

/**
 * Run-result decorations attached to every request in the result tree —
 * shared by both protocols.
 */
type TestRunnerResultFields = {
  type: "test-response"
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
  isLoading?: boolean
  error?: string
  renderResults?: boolean
  passedTests: number
  failedTests: number
  runnerRequestID?: string
  /** Folder names from the run root down to this request's parent. */
  folderPath?: string[]
}

/**
 * A request inside a collection run. Unified collections hold both REST and
 * GraphQL requests in the same `requests` array, so the runner discriminates
 * per entry by shape (`isGQLRequest`). GraphQL responses are shaped as
 * `HoppRESTResponse` (GraphQL-over-HTTP is a POST) so the result tree and
 * response viewer render both protocols identically.
 */
export type TestRunnerRequest = (HoppRESTRequest | HoppGQLRequest) &
  TestRunnerResultFields

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
    request: HoppRESTRequest | HoppGQLRequest,
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
    ancestorTestScripts: string[] = [],
    // Pre-resolved under their owning collections; the run root's own
    // variables stay raw on `collection.variables` for the plan walk.
    ancestorVariables: HoppCollectionVariable[] = []
  ) {
    // `undefined` runs the full collection; an array runs that subset.
    const selection = tab.value.document.selectedRequestRefIds
    const selectionActive = Array.isArray(selection)
    const selectedIDs = new Set(selection ?? [])

    // A selection can resolve to zero requests: an explicitly empty array
    // (the UI sends `undefined` for "run all"), or IDs that stopped resolving
    // after a refetch. Fail loudly rather than report a successful empty run.
    if (
      selectionActive &&
      !this.collectionHasSelectedRequest(collection, [], selectedIDs, true)
    ) {
      tab.value.document.status = "error"
      console.error(
        "[Test Runner] The request selection matches no requests in this " +
          "collection. Provide at least one request that exists in the tree, " +
          "or omit the selection to run the full collection."
      )
      return
    }

    // Reset the result collection
    tab.value.document.status = "running"
    tab.value.document.resultCollection = undefined
    tab.value.document.iterationResults = []
    tab.value.document.selectedIteration = 0
    tab.value.document.testRunnerMeta = this.createEmptyMeta()
    clearTemporaryVariables()

    // One run per dataset row when a data file is attached; config.iterations
    // only drives dataset-less runs (persisted/external state can diverge
    // from the UI's lock).
    const resolvedIterations = options.dataset?.rows.length
      ? options.dataset.rows.length
      : Math.max(1, Math.floor(Number(options.iterations)) || 1)

    // The selection array doubles as the run order; anything it doesn't
    // mention keeps collection order, after everything it does.
    const runOrder = new Map((selection ?? []).map((id, index) => [id, index]))

    this.runTestIterations(
      tab,
      collection,
      options,
      resolvedIterations,
      selectedIDs,
      selectionActive,
      runOrder,
      ancestorPreRequestScripts,
      ancestorTestScripts,
      ancestorVariables
    )
      .then(() => {
        tab.value.document.status = "stopped"
      })
      .catch((error) => {
        if (isStopSignal(error)) {
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
    runOrder: Map<string, number>,
    ancestorPreRequestScripts: string[] = [],
    ancestorTestScripts: string[] = [],
    ancestorVariables: HoppCollectionVariable[] = []
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

      // Without persisted values the env stores are never written back
      // mid-iteration, so one snapshot serves the whole iteration. With
      // keepVariableValues on, each request re-captures (left undefined here).
      const iterationEnvState = options.keepVariableValues
        ? undefined
        : captureInitialEnvironmentState()

      const resultCollection = this.createResultCollection(collection)
      const meta = this.createEmptyMeta()
      // The UI locks the iteration count to the dataset length; if the two
      // ever diverge, reuse the last row rather than read out of bounds.
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
      // `selectedIteration` is the iteration the user is VIEWING — owned by
      // the jump control and scroll tracking, not the run. Advancing it here
      // left a finished run's counter parked on the last iteration while the
      // viewport still showed the first.
      tab.value.document.resultCollection = resultCollection

      // Read the collection back off the document: the assignment above stores
      // the raw object, and mutating a raw object never notifies Vue — rows
      // must be appended through the reactive view.
      const liveResultCollection = tab.value.document.resultCollection!

      const orderedPlan = applyRunOrder(
        this.planCollection(
          collection,
          selectedIDs,
          selectionActive,
          [],
          [],
          undefined,
          undefined,
          ancestorVariables,
          ancestorPreRequestScripts,
          ancestorTestScripts
        ),
        runOrder
      )

      // Results are a flat list in run order; each row carries its folder
      // path instead of nesting back under folders.
      orderedPlan.forEach((entry) =>
        this.addRequestToPath(liveResultCollection, [], {
          ...cloneDeep(entry.request),
          runnerRequestID: entry.id,
          folderPath: entry.folderPath,
          passedTests: 0,
          failedTests: 0,
        })
      )

      tab.value.document.testRunnerMeta.totalRequests += orderedPlan.length
      meta.totalRequests += orderedPlan.length

      await this.runPlan(
        tab,
        orderedPlan,
        options,
        meta,
        iterationVars,
        iterationEnvState
      )
    }
  }

  /**
   * Walks the collection and returns the requests to run, each with inherited
   * auth/headers/variables/scripts resolved against its own ancestry.
   *
   * Planning is separate from execution so the run sequence can reorder
   * across folders; result slots are allocated after ordering so results
   * read in executed order.
   */
  private planCollection(
    collection: HoppCollection,
    selectedIDs: Set<string>,
    selectionActive: boolean,
    sourceParentPath: number[] = [],
    folderPath: string[] = [],
    parentHeaders?: HoppRESTHeaders,
    parentAuth?: HoppRESTRequest["auth"],
    parentVariables: HoppCollection["variables"] = [],
    parentPreRequestScripts: string[] = [],
    parentTestScripts: string[] = []
  ): PlannedRequest[] {
    const inheritedAuth =
      collection.auth?.authType === "inherit" && collection.auth.authActive
        ? parentAuth || { authType: "none", authActive: false }
        : collection.auth || { authType: "none", authActive: false }

    const inheritedHeaders: HoppRESTHeaders = [
      ...(parentHeaders || []),
      ...collection.headers,
    ]

    // Parents pass through already resolved; only this collection's own
    // variables are populated here, under its own ID. The server `id`
    // fallback mirrors the save-side keying for team collections, whose
    // `_ref_id` is regenerated on every fetch. `showSecret` is true because
    // this feeds execution only — planned requests are never persisted.
    const inheritedVariables = resolveInheritedVariables(
      parentVariables,
      collection.variables,
      collection._ref_id || collection.id,
      collection.id,
      true
    )

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

    const planned: PlannedRequest[] = []

    // Folders (depth-first) before a node's own requests — must match
    // `collectRequestIDs` and the run-sequence UI's flatten.
    for (let i = 0; i < collection.folders.length; i++) {
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

      planned.push(
        ...this.planCollection(
          folder,
          selectedIDs,
          selectionActive,
          sourcePath,
          [...folderPath, folder.name],
          inheritedHeaders,
          inheritedAuth,
          inheritedVariables,
          inheritedPreRequestScripts,
          inheritedTestScripts
        )
      )
    }

    for (let i = 0; i < collection.requests.length; i++) {
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

      // Cast note: collection auth is the full REST auth union, so a GQL
      // request inheriting (say) digest auth temporarily violates the
      // HoppGQLAuth type. That's deliberate — the GQL run executor signs
      // with the REST auth generators, which cover the full union.
      //
      // Headers: REST pre-merges inherited headers into the request (the
      // REST executor expects that). GQL keeps its own headers and gets the
      // inherited ones separately, so the executor can slot auth headers
      // between them (precedence: request > auth > inherited).
      planned.push({
        id: getRequestSelectionID(request, sourcePath),
        request: {
          ...request,
          auth:
            request.auth.authType === "inherit" && request.auth.authActive
              ? inheritedAuth
              : request.auth,
          headers: isGQLRequest(request)
            ? request.headers
            : [...inheritedHeaders, ...request.headers],
        } as TestRunnerRequest,
        collection,
        folderPath,
        inheritedVariables,
        inheritedPreRequestScripts,
        inheritedTestScripts,
        inheritedHeaders,
      })
    }

    return planned
  }

  /**
   * Runs a plan in the given order, which is the user's run sequence when they
   * set one and plain collection order otherwise.
   */
  private async runPlan(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    plan: PlannedRequest[],
    options: TestRunnerOptions,
    iterationMeta: TestRunnerMeta,
    iterationVars: Environment["variables"],
    iterationEnvState?: InitialEnvironmentState
  ) {
    try {
      for (const [index, entry] of plan.entries()) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        await this.runTestRequest(
          tab,
          entry.request,
          entry.collection,
          options,
          // Result rows are allocated in this same order: plan index = row.
          [index],
          iterationMeta,
          iterationVars,
          entry.inheritedVariables,
          entry.inheritedPreRequestScripts,
          entry.inheritedTestScripts,
          iterationEnvState,
          entry.inheritedHeaders
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
      if (isStopSignal(error)) {
        throw error
      }
      tab.value.document.status = "error"
      console.error("Collection execution failed:", error)
      throw error
    }
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

    // Mutate in place: selecting a request stores a reference to this object
    // on the tab (`document.request`); replacing it would orphan that
    // reference and the response would never reach the selected view.
    if (path.length > 0) {
      const index = path[path.length - 1]
      const target = current.requests[index]
      if (target) Object.assign(target, updates)
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
    iterationEnvState?: InitialEnvironmentState,
    inheritedHeaders: HoppRESTHeaders = []
  ) {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    // GraphQL requests take their own execution path — no script stages
    // (GraphQL requests carry no pre-request/test scripts), response shaped
    // as HoppRESTResponse so the shared result UI renders it.
    if (isGQLRequest(request)) {
      return this.runTestGQLRequest(
        tab,
        request as HoppGQLRequest,
        options,
        path,
        iterationMeta,
        inheritedVariables,
        inheritedHeaders,
        iterationEnvState
      )
    }

    try {
      // Update request status in the result collection
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        isLoading: true,
        error: undefined,
      })

      // Reuse the per-iteration snapshot when variable values aren't
      // persisted; otherwise re-capture so this request sees env changes
      // persisted by earlier requests in the run.
      const initialEnvironmentState =
        iterationEnvState ?? captureInitialEnvironmentState()

      const results = await runTestRunnerRequest(
        request as HoppRESTRequest,
        options.keepVariableValues,
        inheritedVariables,
        initialEnvironmentState,
        inheritedPreRequestScripts,
        inheritedTestScripts,
        iterationVars
      )

      if (options.stopRef?.value) {
        // Clear the loading flag so a stop taken mid-flight doesn't leave a
        // permanent spinner on the row.
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          isLoading: false,
        })
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

        // A post-request script failure arrives as a Right with `scriptError`
        // set, so the Left/stop-on-error branch below never sees it. Halt
        // here after the row and meta have recorded the request.
        if (options.stopOnError && testResult.scriptError) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped due to error")
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
      if (isStopSignal(error)) {
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

  /**
   * Executes a GraphQL request inside a run. Mirrors `runTestRequest`'s
   * result handling minus the test-script stages — GraphQL requests have no
   * scripts in their schema, so they contribute requests/time to the run
   * meta but no test counts.
   *
   * `testResults` is deliberately left `undefined` (not `null`): the runner
   * response panel treats `testResults === null` as "still executing".
   */
  private async runTestGQLRequest(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    request: HoppGQLRequest,
    options: TestRunnerOptions,
    path: number[],
    iterationMeta: TestRunnerMeta,
    inheritedVariables: HoppCollectionVariable[] = [],
    inheritedHeaders: HoppRESTHeaders = [],
    iterationEnvState?: InitialEnvironmentState
  ) {
    try {
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        isLoading: true,
        error: undefined,
      })

      await nextTick()

      // Reuse the per-iteration snapshot when variable values aren't
      // persisted; otherwise re-capture so this request sees env changes
      // persisted by earlier requests in the run.
      const initialEnvironmentState =
        iterationEnvState ?? captureInitialEnvironmentState()

      const results = await runTestRunnerGQLRequest(
        request,
        options.keepVariableValues,
        inheritedVariables,
        initialEnvironmentState,
        inheritedHeaders
      )

      if (options.stopRef?.value) {
        throw new Error("Test execution stopped")
      }

      if (E.isRight(results)) {
        const { response } = results.right

        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          response: options.persistResponses ? response : null,
          isLoading: false,
        })

        if (response.type === "success") {
          tab.value.document.testRunnerMeta.totalTime +=
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests += 1
          iterationMeta.totalTime += response.meta.responseDuration
          iterationMeta.completedRequests += 1
        }
      } else {
        const errorMsg =
          results.left.type === "subscription_unsupported"
            ? "GraphQL subscriptions are not supported in the collection runner"
            : results.left.message

        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          error: errorMsg,
          isLoading: false,
          response: null,
        })

        if (options.stopOnError) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped due to error")
        }
      }
    } catch (error) {
      if (isStopSignal(error)) {
        throw error
      }

      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred"

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

  private getTestResultInfo(testResult: HoppTestData | HoppTestResult) {
    let passed = 0
    // A failed script means the request's assertions never ran — count it as
    // one failure so the meta counters and the run outcome reflect it.
    // (`scriptError` exists only on the top-level `HoppTestResult`.)
    let failed = "scriptError" in testResult && testResult.scriptError ? 1 : 0

    for (const result of testResult.expectResults) {
      if (result.status === "pass") {
        passed++
      } else if (result.status === "fail" || result.status === "error") {
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
