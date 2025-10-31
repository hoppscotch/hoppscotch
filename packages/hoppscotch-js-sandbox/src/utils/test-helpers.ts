/**
 * Consolidated test helpers for all namespace tests
 *
 * This file provides reusable helper functions to eliminate duplication
 * across 45+ test files that previously had inline `func` definitions.
 */

import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { runTestScript, runPreRequestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

// Default fixtures used across test files
export const defaultRequest = getDefaultRESTRequest()
export const fakeResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  responseTime: 0,
  body: "hoi",
  headers: [],
}

/**
 * Run a test script and return the test results
 *
 * This is the most common pattern used across all test files.
 * Replaces the inline `func` helper pattern.
 *
 * @param script - The test script to execute
 * @param envs - Environment variables (defaults to empty)
 * @param response - Response object (defaults to fakeResponse)
 * @param request - Request object (defaults to defaultRequest)
 * @returns TaskEither containing test results
 *
 * @example
 * ```typescript
 * test("pm.expect assertion", () => {
 *   return expect(
 *     runTest(`pm.test("test", () => pm.expect(1).to.equal(1))`, {
 *       global: [],
 *       selected: []
 *     })()
 *   ).resolves.toEqualRight([...])
 * })
 * ```
 */
export const runTest = (
  script: string,
  envs: TestResult["envs"],
  response: TestResponse = fakeResponse,
  request: ReturnType<typeof getDefaultRESTRequest> = defaultRequest
) =>
  pipe(
    runTestScript(script, {
      envs,
      request,
      response,
    }),
    TE.map((x) => x.tests)
  )

/**
 * Run a pre-request script and return the environment variables
 *
 * Used for testing pre-request scripts that modify environment variables.
 *
 * @param script - The pre-request script to execute
 * @param envs - Initial environment variables (defaults to empty)
 * @param request - Request object (defaults to defaultRequest)
 * @returns TaskEither containing environment variables
 *
 * @example
 * ```typescript
 * test("pm.environment.set in pre-request", () => {
 *   return expect(
 *     runPreRequest(
 *       `pm.environment.set("key", "value")`,
 *       { global: [], selected: [] }
 *     )()
 *   ).resolves.toEqualRight({
 *     global: [],
 *     selected: [{ key: "key", value: "value", secret: false }]
 *   })
 * })
 * ```
 */
export const runPreRequest = (
  script: string,
  envs: TestResult["envs"],
  request: ReturnType<typeof getDefaultRESTRequest> = defaultRequest
) =>
  pipe(
    runPreRequestScript(script, {
      envs,
      request,
    }),
    TE.map((x) => x.updatedEnvs)
  )

/**
 * Run a test script with custom response
 *
 * Convenience wrapper when you only need to customize the response.
 *
 * @param script - The test script to execute
 * @param response - Custom response object
 * @param envs - Environment variables (defaults to empty)
 * @returns TaskEither containing test results
 */
export const runTestWithResponse = (
  script: string,
  response: TestResponse,
  envs: TestResult["envs"] = { global: [], selected: [] }
) => runTest(script, envs, response)

/**
 * Run a test script with custom request
 *
 * Convenience wrapper when you only need to customize the request.
 *
 * @param script - The test script to execute
 * @param request - Custom request object
 * @param envs - Environment variables (defaults to empty)
 * @param response - Response object (defaults to fakeResponse)
 * @returns TaskEither containing test results
 */
export const runTestWithRequest = (
  script: string,
  request: ReturnType<typeof getDefaultRESTRequest>,
  envs: TestResult["envs"] = { global: [], selected: [] },
  response: TestResponse = fakeResponse
) => runTest(script, envs, response, request)

/**
 * Run a test script with empty environments
 *
 * Convenience wrapper for the most common case (no environment variables).
 *
 * @param script - The test script to execute
 * @param response - Response object (defaults to fakeResponse)
 * @returns TaskEither containing test results
 */
export const runTestWithEmptyEnv = (
  script: string,
  response: TestResponse = fakeResponse
) => runTest(script, { global: [], selected: [] }, response)

/**
 * Run a test script and return the environment variables (not test results)
 *
 * Used for testing scripts that modify environment variables but you want
 * to inspect the final env state rather than test results.
 *
 * This is different from runPreRequest which uses runPreRequestScript.
 * This uses runTestScript but extracts envs instead of tests.
 *
 * @param script - The test script to execute
 * @param envs - Initial environment variables
 * @param response - Response object (defaults to fakeResponse)
 * @param request - Request object (defaults to defaultRequest)
 * @returns TaskEither containing environment variables
 *
 * @example
 * ```typescript
 * test("env mutation in test script", () => {
 *   return expect(
 *     runTestAndGetEnvs(
 *       `pw.env.set("key", "value")`,
 *       { global: [], selected: [] }
 *     )()
 *   ).resolves.toEqualRight({
 *     global: [],
 *     selected: [{ key: "key", value: "value", secret: false }]
 *   })
 * })
 * ```
 */
export const runTestAndGetEnvs = (
  script: string,
  envs: TestResult["envs"],
  response: TestResponse = fakeResponse,
  request: ReturnType<typeof getDefaultRESTRequest> = defaultRequest
) =>
  pipe(
    runTestScript(script, {
      envs,
      request,
      response,
    }),
    TE.map((x: TestResult) => x.envs)
  )
