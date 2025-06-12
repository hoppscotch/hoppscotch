import { TestResponse } from "@hoppscotch/js-sandbox";
import { Method } from "axios";
import { ExpectResult } from "../types/response";
import { HoppEnvs } from "../types/request";

/**
 * Defines column headers for table stream used to write table
 * data on stdout.
 * @property {string} path Path of request within collection file.
 * @property {string} endpoint Endpoint from response config.url.
 * @property {Method} method Method from response headers.
 * @property {string} statusCode Template string concatenating status & statusText.
 */
export interface TableResponse {
  endpoint: string;
  method: Method;
  statusCode: string;
}

/**
 * Describes additional details of HTTP response returned from
 * requestRunner.
 * @property {string} path Path of request within collection file.
 * @property {string} endpoint Endpoint from response config.url.
 * @property {Method} method Method from HTTP response headers.
 * @property {string} statusText HTTP response status text.
 */
export interface RequestRunnerResponse extends TestResponse {
  endpoint: string;
  method: Method;
  statusText: string;
  duration: number;
}

/**
 * Describes test script details.
 * @property {string} name Request name within collection.
 * @property {string} testScript Stringified hoppscotch testScript, used while
 * running testRunner.
 * @property {TestResponse} response Response structure for test script runner.
 */
export interface TestScriptParams {
  testScript: string;
  response: TestResponse;
  envs: HoppEnvs;
  legacySandbox: boolean;
}

/**
 * Describe properties of test-report generated from test-runner.
 * @property {string} descriptor Test description.
 * @property {ExpectResult[]} expectResults Expected results for each
 * test-case.
 * @property {number} failed Total failed test-cases.
 * @property {number} passed Total passed test-cases;
 */
export interface TestReport {
  descriptor: string;
  expectResults: ExpectResult[];
  failed: number;
  passed: number;
}

/**
 * Describes error pair for failed HTTP requests.
 * @example { 501: "Request Not Supported" }
 */
export interface ResponseErrorPair {
  [key: number]: string;
}
