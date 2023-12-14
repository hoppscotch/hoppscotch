import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { Ref, ref, watch } from "vue"
import { TestRunnerConfig } from "~/components/http/test/Runner.vue"
import { runTestRunnerRequest } from "~/helpers/RequestRunner"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import * as E from "fp-ts/Either"

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

      console.log(request)
    } else {
      console.error("Script failed")
    }
  }

  private async runTestCollection(
    state: Ref<TestRunState>,
    collection: HoppCollection<TestRunnerRequest>,
    options: TestRunnerOptions
  ) {
    for (const folder of collection.folders) {
      await this.runTestCollection(state, folder, options)
    }

    for (const request of collection.requests) {
      await this.runTestRequest(state, request, options)
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
