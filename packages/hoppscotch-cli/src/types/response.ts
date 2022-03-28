import { TestReport } from "../interfaces/response";
import { HoppEnvs } from "./request";

/**
 * The expectation failed (fail) or errored (error)
 */
export type ExpectResult = {
  status: "pass" | "fail" | "error";
  message: string;
};

export type TestMetrics = {
  /**
   * Total passed and failed test-cases.
   */
  tests: { failing: number; passing: number };

  /**
   * Total test-blocks/test-suites passed & failed, calculated
   * based on test-cases failed/passed with in each test-block.
   */
  testSuites: { failing: number; passing: number };
};

export type TestRunnerRes = {
  envs: HoppEnvs;
  testsReport: TestReport[];
};
