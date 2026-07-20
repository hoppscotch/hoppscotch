import { describe, expect, test } from "vitest"

import { HoppTestRunnerDocument } from "~/helpers/rest/document"
import { buildRunnerResultReport } from "../runnerResults"

// Minimal document fixture: a single iteration with one request whose response
// carries the given kernel response `type`. Cast through `unknown` so the
// fixture only has to specify the fields the report builder actually reads.
const makeDocument = (
  responseType: "success" | "fail"
): HoppTestRunnerDocument => {
  const response = {
    type: responseType,
    statusCode: responseType === "fail" ? 500 : 200,
    statusText: responseType === "fail" ? "Internal Server Error" : "OK",
    headers: [{ key: "content-type", value: "application/json" }],
    body: new TextEncoder().encode(`{"error":${responseType === "fail"}}`)
      .buffer,
    meta: { responseSize: 17, responseDuration: 42 },
    req: {},
  }

  const request = {
    name: "req",
    method: "GET",
    endpoint: "https://example.com",
    passedTests: 0,
    failedTests: 0,
    error: undefined,
    testResults: null,
    response,
  }

  const meta = {
    totalRequests: 1,
    completedRequests: 1,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    totalTime: 42,
  }

  return {
    collectionID: "coll-id",
    collection: { name: "My Collection" },
    collectionType: "my-collections",
    environmentName: "Env",
    status: "idle",
    selectedIteration: 0,
    config: {
      iterations: 1,
      delay: 0,
      stopOnError: false,
      persistResponses: true,
      keepVariableValues: false,
    },
    testRunnerMeta: meta,
    iterationResults: [
      {
        iteration: 0,
        meta,
        resultCollection: {
          name: "My Collection",
          folders: [],
          requests: [request],
        },
      },
    ],
  } as unknown as HoppTestRunnerDocument
}

describe("buildRunnerResultReport", () => {
  test("preserves status/headers/body/meta for failed (4xx/5xx) responses", () => {
    const report = buildRunnerResultReport(
      makeDocument("fail"),
      "all",
      "base64"
    )
    const exported = report.iterationResults[0].requests[0].response

    // Regression guard: error responses carry kernel type "fail" (not "failure"),
    // so they must be serialized with full detail rather than falling through to
    // the generic { type, error } branch that drops everything else.
    expect(exported?.type).toBe("fail")
    expect(exported?.statusCode).toBe(500)
    expect(exported?.statusText).toBe("Internal Server Error")
    expect(exported?.durationInMs).toBe(42)
    expect(exported?.sizeInBytes).toBe(17)
    expect(exported?.headers).toEqual([
      { key: "content-type", value: "application/json" },
    ])
    expect(exported?.body).toBeDefined()
  })

  test("serializes successful responses with full detail", () => {
    const report = buildRunnerResultReport(
      makeDocument("success"),
      "all",
      "base64"
    )
    const exported = report.iterationResults[0].requests[0].response

    expect(exported?.type).toBe("success")
    expect(exported?.statusCode).toBe(200)
    expect(exported?.durationInMs).toBe(42)
  })

  test("derives a failed outcome from an errored assertion (no plain failures)", () => {
    const request = {
      name: "req",
      method: "GET",
      endpoint: "https://example.com",
      passedTests: 1,
      failedTests: 0,
      error: undefined,
      testResults: {
        description: "",
        scriptError: false,
        expectResults: [{ status: "error", message: "assertion threw" }],
        tests: [],
      },
      response: null,
    }

    const document = {
      collectionID: "coll-id",
      collection: { name: "My Collection" },
      collectionType: "my-collections",
      status: "idle",
      selectedIteration: 0,
      config: { iterations: 1 },
      testRunnerMeta: {
        totalRequests: 1,
        completedRequests: 1,
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        totalTime: 0,
      },
      iterationResults: [
        {
          iteration: 0,
          meta: {
            totalRequests: 1,
            completedRequests: 1,
            totalTests: 1,
            passedTests: 1,
            failedTests: 0,
            totalTime: 0,
          },
          resultCollection: {
            name: "My Collection",
            folders: [],
            requests: [request],
          },
        },
      ],
    } as unknown as HoppTestRunnerDocument

    const report = buildRunnerResultReport(document, "all", "none")
    expect(report.outcome).toBe("failed")
  })
})
