import { HoppCollection } from "@hoppscotch/data"
import { Service } from "dioc"
import { Ref, ref } from "vue"
import { TestRunnerConfig } from "~/components/http/test/Runner.vue"

export type TestRunState = {
  status: "idle" | "running" | "stopped"
  totalRequests: number
  totalTime: number
  results: any[]
}

/**
 * This service is responsible to run requests and tests of collections
 */
export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  constructor() {
    super()
  }

  public runTests(
    collection: HoppCollection<any>,
    options: {
      stop: Ref<boolean>
    } & TestRunnerConfig
  ): Ref<TestRunState> {
    const state = ref<TestRunState>({
      status: "running",
      totalRequests: 0,
      totalTime: 0,
      results: [],
    })

    console.log(collection)

    return state
  }
}
