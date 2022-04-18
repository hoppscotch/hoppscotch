import { TestReport } from "../interfaces/response";
import { HoppEnvs } from "./request";

/**
 * The expectation failed (fail) or errored (error)
 */
export type ExpectResult = {
  status: "pass" | "fail" | "error";
  message: string;
};

/**
 * Stats describing number of failed and passed for test-cases/test-suites/
 * test-scripts/pre-request-scripts/request.
 */
export type Stats = {
  failed: number;
  passed: number;
};

export type PreRequestMetrics = {
  /**
   * Pre-request-script(s) failed and passed stats.
   */
  scripts: Stats;

  /**
   * Time taken (in seconds) to execute pre-request-script(s).
   */
  duration: number;
};

export type RequestMetrics = {
  /**
   * Request(s) failed and passed stats.
   */
  requests: Stats;

  /**
   * Time taken (in seconds) to execute request(s).
   */
  duration: number;
};

export type TestMetrics = {
  /**
   * Test-cases failed and passed stats.
   */
  tests: Stats;

  /**
   * Test-block(s)/test-suite(s) failed and passed stats.
   */
  testSuites: Stats;

  /**
   * Test script(s) execution failed and passed stats.
   */
  scripts: Stats;

  /**
   * Time taken (in seconds) to execute test-script(s).
   */
  duration: number;
};

export type TestRunnerRes = {
  /**
   * Updated envs after running test-script.
   */
  envs: HoppEnvs;

  /**
   * Describes expected details for each test-suite.
   */
  testsReport: TestReport[];

  /**
   * Time taken (in seconds) to execute the test-script.
   */
  duration: number;
};
