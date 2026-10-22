import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { TestRunnerResultCollectionSchema } from "../index"

// A HoppRESTRequest augmented with the runner-only result fields, as it lives
// inside a persisted test-runner result collection.
const makeRunnerRequest = (name: string) => ({
  ...getDefaultRESTRequest(),
  name,
  type: "test-response" as const,
  passedTests: 2,
  failedTests: 1,
  runnerRequestID: `rid-${name}`,
  error: undefined,
  isLoading: false,
  renderResults: true,
  testResults: {
    tests: [],
    expectResults: [],
    description: "",
    scriptError: false,
    envDiff: {
      global: { additions: [], updations: [], deletions: [] },
      selected: { additions: [], updations: [], deletions: [] },
    },
    consoleEntries: [],
  },
})

const makeResultCollection = () => ({
  v: 12,
  name: "Result Collection",
  auth: { authType: "inherit", authActive: true },
  headers: [],
  variables: [],
  description: null,
  preRequestScript: "",
  testScript: "",
  requests: [makeRunnerRequest("top")],
  folders: [
    {
      v: 12,
      name: "Nested",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
      description: null,
      preRequestScript: "",
      testScript: "",
      requests: [makeRunnerRequest("nested")],
      folders: [],
    },
  ],
})

describe("TestRunnerResultCollectionSchema", () => {
  test("preserves runner result fields on requests through a persist round-trip", () => {
    const parsed = TestRunnerResultCollectionSchema.safeParse(
      makeResultCollection()
    )

    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const data = parsed.data as ReturnType<typeof makeResultCollection>
    const topRequest = data.requests[0]

    // The runner-only fields must survive (the bug was HoppRESTCollectionSchema
    // stripping them, blanking restored results and JSON export).
    expect(topRequest.passedTests).toBe(2)
    expect(topRequest.failedTests).toBe(1)
    expect(topRequest.runnerRequestID).toBe("rid-top")
    expect(topRequest.testResults).toBeDefined()
    expect(topRequest.testResults?.scriptError).toBe(false)

    // ...and recursively for folder-nested requests.
    const nestedRequest = data.folders[0].requests[0]
    expect(nestedRequest.passedTests).toBe(2)
    expect(nestedRequest.runnerRequestID).toBe("rid-nested")
    expect(nestedRequest.testResults).toBeDefined()
  })

  test("migrates an older-version collection while keeping runner fields", () => {
    // A v2 collection (pre-dates variables/preRequestScript/testScript). It must
    // be migrated to the latest version — not rejected — and still keep the
    // runner result fields on its requests.
    const legacyCollection = {
      v: 2,
      name: "Legacy Collection",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      requests: [makeRunnerRequest("legacy")],
      folders: [],
    }

    const parsed = TestRunnerResultCollectionSchema.safeParse(legacyCollection)

    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const data = parsed.data as ReturnType<typeof makeResultCollection> & {
      v: number
    }

    // Migrated up: version bumped and the newer collection fields were filled.
    expect(data.v).toBeGreaterThan(2)
    expect(data.variables).toBeDefined()
    expect(data.preRequestScript).toBeDefined()

    // ...and the runner result fields survived the migration.
    expect(data.requests[0].passedTests).toBe(2)
    expect(data.requests[0].runnerRequestID).toBe("rid-legacy")
    expect(data.requests[0].testResults).toBeDefined()
  })
})
