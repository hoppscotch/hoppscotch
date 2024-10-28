import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { Ref, ref } from "vue"
import { runTestRunnerRequest } from "~/helpers/RequestRunner"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import { RESTTabService } from "../tab/rest"
import { TestRunnerConfig } from "~/helpers/rest/document"

export type TestRunState = {
  status: "idle" | "running" | "stopped" | "error"
  totalRequests: number
  totalTime: number
  completedRequests: number
  errors: Array<{
    requestPath: string
    error: string
  }>
  result: HoppCollection
}

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

export type TestRunnerRequest = HoppRESTRequest & {
  type: "test-response"
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
  isLoading: boolean
  error?: string
  renderResults?: boolean
}

function delay(timeMS: number) {
  return new Promise((resolve) => setTimeout(resolve, timeMS))
}

export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  private readonly restTab = this.bind(RESTTabService)

  private getRequestPath(
    collection: HoppCollection,
    request: TestRunnerRequest,
    parentPath: string = ""
  ): string {
    const currentPath = parentPath
      ? `${parentPath} > ${collection.name}`
      : collection.name

    if (collection.requests.includes(request)) {
      return `${currentPath} > ${request.name}`
    }

    for (const folder of collection.folders) {
      const path = this.getRequestPath(folder, request, currentPath)
      if (path) return path
    }

    return ""
  }

  private async runTestRequest(
    state: Ref<TestRunState>,
    request: TestRunnerRequest,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    try {
      request.isLoading = true
      request.error = undefined

      const tab = this.restTab.getActiveTab()
      const results = await runTestRunnerRequest(tab, request)

      if (results && E.isRight(results)) {
        const { response, testResult } = results.right
        request.testResults = testResult
        request.response = response

        if (response.type === "success" || response.type === "fail") {
          state.value.totalTime += response.meta.responseDuration
          state.value.completedRequests++
        }
      } else {
        const errorMsg = "Request execution failed"
        request.error = errorMsg
        state.value.errors.push({
          requestPath: this.getRequestPath(collection, request),
          error: errorMsg,
        })
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred"
      request.error = errorMsg
      state.value.errors.push({
        requestPath: this.getRequestPath(collection, request),
        error: errorMsg,
      })
    } finally {
      request.isLoading = false
    }
  }

  private async runTestCollection(
    state: Ref<TestRunState>,
    collection: TestRunState["result"],
    options: TestRunnerOptions
  ) {
    try {
      for (const folder of collection.folders) {
        if (options.stopRef?.value) {
          state.value.status = "stopped"
          break
        }
        folder.renderResults = options.renderResults
        await this.runTestCollection(state, folder, options)
      }

      for (const request of collection.requests) {
        if (options.stopRef?.value) {
          state.value.status = "stopped"
          break
        }
        await this.runTestRequest(state, request, collection, options)
        await delay(options.delay ?? 0)
      }
    } catch (error) {
      state.value.status = "error"
      console.error("Collection execution failed:", error)
    }
  }

  public runTests(
    collection: HoppCollection,
    options: TestRunnerOptions
  ): Ref<TestRunState> {
    const state = ref<TestRunState>({
      status: "running",
      totalRequests: collection.requests.length,
      totalTime: 0,
      completedRequests: 0,
      errors: [],
      result: cloneDeep(collection),
    })

    // Initialize requests with loading state
    const initializeRequests = (coll: HoppCollection) => {
      coll.requests = coll.requests.map((req) => ({
        ...req,
        isLoading: false,
      }))
      coll.folders.forEach((folder) => initializeRequests(folder))
    }

    state.value.result.renderResults = false
    initializeRequests(state.value.result)

    this.runTestCollection(state, state.value.result, options)
      .catch((error) => {
        state.value.status = "error"
        console.error("Test runner failed:", error)
      })
      .finally(() => {
        if (state.value.status === "running") {
          state.value.status = "stopped"
        }
      })

    return state
  }
}
