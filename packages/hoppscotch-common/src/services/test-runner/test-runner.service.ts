import { Service } from "dioc"

/**
 * This service is responsible to run requests and tests of collections
 */
export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  constructor() {
    super()
  }
}
