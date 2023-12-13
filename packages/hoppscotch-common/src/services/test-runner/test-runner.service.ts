import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { Ref, ref, watch } from "vue"
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
  stop?: Ref<boolean>
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
}

/**
 * This service is responsible to run requests and tests of collections
 */
export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  constructor() {
    super()
  }

  private runTestRequest(
    state: Ref<TestRunState>,
    request: HoppRESTRequest,
    options: TestRunnerOptions
  ) {
    runTestRunnerRequest(request)
  }

  private runTestCollection(
    state: Ref<TestRunState>,
    collection: HoppCollection<TestRunnerRequest>,
    options: TestRunnerOptions
  ) {
    if (collection.requests.length) {
      for (const request of collection.requests) {
        this.runTestRequest(state, request, options)
      }
    }
    if (collection.folders.length) {
      for (const folder of collection.folders) {
        this.runTestCollection(state, folder, options)
      }
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
      result: collection,
    })

    this.runTestCollection(state, state.value.result, options)

    console.log(collection)

    watch(state.value, (data) => {
      console.log(
        `Status: ${data.status} - Requests: ${data.totalRequests} - Time: ${data.totalTime}`,
        data
      )
    })

    return state
  }
}
