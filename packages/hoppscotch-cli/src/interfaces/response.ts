import { TestResponse } from "@hoppscotch/js-sandbox/lib/test-runner";
import { Method } from "axios";
import { ExpectResult } from "../types";

/**
 * Table response interface
 * @property {string} path - Request path from request stack.
 * @property {string} endpoint - Endpoint from response config.url.
 * @property {Method} method - Method from response headers.
 * @property {string} statusCode - Template string concating status + statusText.
 */
export interface TableResponse {
  path: string;
  endpoint: string;
  method: Method;
  statusCode: string;
}

/**
 * Runner response info interface extending type:TestResponse.
 * @property {string} path - Request path from request stack.
 * @property {string} endpoint - Endpoint from response config.url.
 * @property {Method} method - Method from response headers.
 * @property {string} statusText - Response status text.
 */
export interface RunnerResponseInfo extends TestResponse {
  path: string;
  endpoint: string;
  method: Method;
  statusText: string;
}

/**
 * Interface to describe test script details.
 * @property {string} name - Request name.
 * @property {string} testScript - Template string for hoppscotch tests.
 * @property {TestResponse} response - Response structure for test script.
 */
export interface TestScriptData {
  name: string;
  testScript: string;
  response: TestResponse;
}

export interface TestReport {
  descriptor: string;
  expectResults: ExpectResult[];
  failing: number;
  passing: number;
}

export interface ResponseErrorPair {
  [key: number]: string;
}
