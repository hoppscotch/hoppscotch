import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { Ref, ref } from "vue"
import { TestRunnerConfig } from "~/components/http/test/Runner.vue"
import { runTestRunnerRequest } from "~/helpers/RequestRunner"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"

export type TestRunState = {
  status: "idle" | "running" | "stopped"
  totalRequests: number
  totalTime: number
  result: HoppCollection<TestRunnerRequest>
}

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

export type TestRunnerRequest = HoppRESTRequest & {
  /**
   * The response as it is in the document
   * (if any)
   */
  response?: HoppRESTResponse | null

  /**
   * The test results as it is in the document
   * (if any)
   */
  testResults?: HoppTestResult | null

  /**
   * Whether to render the results in the UI
   */
  renderResults?: boolean
}

/**
 * Delays the execution of the script
 * @param timeMS The time to wait in milliseconds
 */
function delay(timeMS: number) {
  return new Promise((resolve) => setTimeout(resolve, timeMS))
}

/**
 * This service is responsible to run requests and tests of collections
 */
export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  constructor() {
    super()
  }

  private async runTestRequest(
    state: Ref<TestRunState>,
    request: TestRunnerRequest,
    options: TestRunnerOptions
  ) {
    const results = await runTestRunnerRequest(request)
    if (results && E.isRight(results)) {
      const { response, testResult } = results.right
      // Use response and testResult
      request.testResults = testResult
      request.response = response

      state.value.totalRequests++
      if (response.type === "success" || response.type === "fail") {
        state.value.totalTime += response.meta.responseDuration
      }
    } else {
      console.error("Script failed")
    }
  }

  private async runTestCollection(
    state: Ref<TestRunState>,
    collection: TestRunState["result"],
    options: TestRunnerOptions
  ) {
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
      await this.runTestRequest(state, request, options)
      await delay(options.delay ?? 0)
    }
  }

  public runTests(
    collection: HoppCollection<TestRunnerRequest>,
    options: TestRunnerOptions
  ): Ref<TestRunState> {
    const state = ref<TestRunState>({
      status: "running",
      totalRequests: 0,
      totalTime: 0,
      result: cloneDeep(collection),
    })

    state.value.result.renderResults = false
    this.runTestCollection(state, state.value.result, options).finally(() => {
      state.value.status = "stopped"
    })

    console.log("collection received in service", collection)

    return state
  }
}
