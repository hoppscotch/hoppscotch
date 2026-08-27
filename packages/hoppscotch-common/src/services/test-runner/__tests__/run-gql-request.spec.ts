import * as E from "fp-ts/Either"
import { ref } from "vue"
import { beforeEach, describe, expect, test, vi } from "vitest"

// RequestRunner drags in the network/kernel stack; these tests only exercise
// the service's GQL result handling. `executedResponses$` must exist on the
// mock — newstore/history subscribes to it at module load.
vi.mock("~/helpers/RequestRunner", () => ({
  captureInitialEnvironmentState: vi.fn(() => ({ initial: "env-state" })),
  runTestRunnerRequest: vi.fn(),
  executedResponses$: { subscribe: vi.fn() },
}))

vi.mock("~/helpers/graphql/testRunner", () => ({
  runTestRunnerGQLRequest: vi.fn(),
}))

import { runTestRunnerGQLRequest } from "~/helpers/graphql/testRunner"
import { getService } from "~/modules/dioc"
import { TestRunnerService } from "../test-runner.service"

const service = getService(TestRunnerService)
const mockedRun = vi.mocked(runTestRunnerGQLRequest)

const gqlRequest = {
  v: 10,
  name: "gql-under-test",
  _ref_id: "gql-1",
  url: "https://example.com/graphql",
  query: "query { hello }",
  variables: "{}",
  headers: [],
  auth: { authType: "none", authActive: false },
  description: null,
  responses: {},
  preRequestScript: "",
  testScript: "",
}

const emptyMeta = () => ({
  totalRequests: 0,
  completedRequests: 0,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalTime: 0,
})

const makeTab = () =>
  ref({
    id: "runner-tab",
    document: {
      type: "test-runner" as const,
      status: "running" as const,
      resultCollection: {
        v: 12,
        name: "run",
        folders: [],
        requests: [
          {
            ...gqlRequest,
            type: "test-response",
            passedTests: 0,
            failedTests: 0,
            isLoading: false,
          },
        ],
        headers: [],
        variables: [],
        auth: { authType: "none", authActive: false },
      },
      testRunnerMeta: emptyMeta(),
    },
  }) as any

const makeOptions = (overrides: Record<string, unknown> = {}) => ({
  stopRef: ref(false),
  delay: 0,
  iterations: 1,
  keepVariableValues: false,
  persistResponses: true,
  stopOnError: false,
  ...overrides,
})

const passingTestResult = (overrides: Record<string, unknown> = {}) => ({
  description: "",
  expectResults: [
    { status: "pass", message: "" },
    { status: "pass", message: "" },
    { status: "fail", message: "" },
  ],
  tests: [],
  envDiff: {
    global: { additions: [], deletions: [], updations: [] },
    selected: { additions: [], deletions: [], updations: [] },
  },
  scriptError: false,
  consoleEntries: [],
  ...overrides,
})

const successResponse = { type: "success", meta: { responseDuration: 42 } }

const runGQL = (
  tab: ReturnType<typeof makeTab>,
  options: ReturnType<typeof makeOptions>,
  iterationMeta = emptyMeta(),
  iterationVars: unknown[] = []
) =>
  (service as any).runTestGQLRequest(
    tab,
    gqlRequest,
    options,
    [0],
    iterationMeta,
    iterationVars
  )

beforeEach(() => {
  mockedRun.mockReset()
})

describe("TestRunnerService.runTestGQLRequest", () => {
  test("forwards dataset iteration variables to the GQL executor", async () => {
    mockedRun.mockResolvedValue(
      E.right({
        response: successResponse,
        testResult: passingTestResult(),
      }) as any
    )

    const iterationVars = [
      {
        key: "col",
        initialValue: "row-1",
        currentValue: "row-1",
        secret: false,
      },
    ]
    await runGQL(makeTab(), makeOptions(), emptyMeta(), iterationVars)

    expect(mockedRun).toHaveBeenCalledTimes(1)
    // (request, keepVariableValues, inheritedVariables, envState,
    //  inheritedHeaders, preScripts, testScripts, iterationVars)
    expect(mockedRun.mock.calls[0][7]).toBe(iterationVars)
  })

  test("writes per-row pass/fail counts and tallies both run metas", async () => {
    mockedRun.mockResolvedValue(
      E.right({
        response: successResponse,
        testResult: passingTestResult(),
      }) as any
    )

    const tab = makeTab()
    const iterationMeta = emptyMeta()
    await runGQL(tab, makeOptions(), iterationMeta)

    const row = tab.value.document.resultCollection.requests[0]
    expect(row.passedTests).toBe(2)
    expect(row.failedTests).toBe(1)
    expect(row.testResults).toBeTruthy()
    expect(row.isLoading).toBe(false)

    for (const meta of [tab.value.document.testRunnerMeta, iterationMeta]) {
      expect(meta.totalTests).toBe(3)
      expect(meta.passedTests).toBe(2)
      expect(meta.failedTests).toBe(1)
      expect(meta.completedRequests).toBe(1)
      expect(meta.totalTime).toBe(42)
    }
  })

  test("stopOnError halts the run on a GQL test-script failure", async () => {
    mockedRun.mockResolvedValue(
      E.right({
        response: successResponse,
        testResult: passingTestResult({
          expectResults: [],
          scriptError: true,
        }),
      }) as any
    )

    const tab = makeTab()
    await expect(
      runGQL(tab, makeOptions({ stopOnError: true }))
    ).rejects.toThrow("Test execution stopped due to error")

    expect(tab.value.document.status).toBe("stopped")
    // The row and meta record the request before the halt
    expect(tab.value.document.testRunnerMeta.failedTests).toBe(1)
    expect(tab.value.document.resultCollection.requests[0].isLoading).toBe(
      false
    )
  })

  test("a stop taken mid-flight clears the row's loading spinner", async () => {
    const options = makeOptions()
    mockedRun.mockImplementation(async () => {
      options.stopRef.value = true
      return E.right({
        response: successResponse,
        testResult: passingTestResult(),
      }) as any
    })

    const tab = makeTab()
    await expect(runGQL(tab, options)).rejects.toThrow("Test execution stopped")

    expect(tab.value.document.resultCollection.requests[0].isLoading).toBe(
      false
    )
  })

  test("executor failures mark the row and honor stopOnError", async () => {
    mockedRun.mockResolvedValue(
      E.left({ type: "subscription_unsupported" }) as any
    )

    const tab = makeTab()
    await expect(
      runGQL(tab, makeOptions({ stopOnError: true }))
    ).rejects.toThrow("Test execution stopped due to error")

    const row = tab.value.document.resultCollection.requests[0]
    expect(row.error).toMatch(/subscriptions are not supported/)
    expect(row.isLoading).toBe(false)
    expect(tab.value.document.status).toBe("stopped")
  })
})
