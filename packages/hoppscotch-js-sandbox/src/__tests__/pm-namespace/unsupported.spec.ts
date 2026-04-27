import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

// Unified test data for APIs that must still throw (Groups 6, 7 and pm.info runner fields)
const unsupportedApis = [
  {
    api: "pm.info.iteration",
    script: "const iteration = pm.info.iteration",
    errorMessage:
      "pm.info.iteration is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.info.iterationCount",
    script: "const iterationCount = pm.info.iterationCount",
    errorMessage:
      "pm.info.iterationCount is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.vault.get()",
    script: 'pm.vault.get("test")',
    errorMessage:
      "pm.vault.get() is not supported in Hoppscotch (Postman Vault feature)",
  },
  {
    api: "pm.vault.set()",
    script: 'pm.vault.set("key", "value")',
    errorMessage:
      "pm.vault.set() is not supported in Hoppscotch (Postman Vault feature)",
  },
  {
    api: "pm.vault.unset()",
    script: 'pm.vault.unset("key")',
    errorMessage:
      "pm.vault.unset() is not supported in Hoppscotch (Postman Vault feature)",
  },
  {
    api: "pm.execution.skipRequest()",
    script: "pm.execution.skipRequest()",
    errorMessage:
      "pm.execution.skipRequest() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.execution.runRequest()",
    script: 'pm.execution.runRequest("request-id")',
    errorMessage:
      "pm.execution.runRequest() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.require()",
    script: 'pm.require("@team/package")',
    errorMessage:
      "pm.require('@team/package') is not supported in Hoppscotch (Package Library feature)",
  },
]

describe("pm namespace - unsupported features", () => {
  // Test unsupported APIs in both pre-request and test scripts
  test.each(unsupportedApis)(
    "$api throws error in pre-request script",
    ({ script, errorMessage }) => {
      return expect(
        runPreRequest(script, {
          global: [],
          selected: [],
        })()
      ).resolves.toEqualLeft(`Script execution failed: Error: ${errorMessage}`)
    }
  )

  test.each(unsupportedApis)(
    "$api throws error in test script",
    async ({ script, errorMessage }) => {
      const result = await runTest(script, {
        global: [],
        selected: [],
      })()

      // Check that the error message contains the expected error text
      // We use toEqualLeft with stringContaining because QuickJS may append GC disposal errors
      expect(result).toEqualLeft(
        expect.stringContaining(
          `Script execution failed: Error: ${errorMessage}`
        )
      )
    }
  )

  test("pm.vault.get() throws error", async () => {
    await expect(
      runTest(`pm.vault.get("test")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.vault.get() is not supported")
    )
  })
})

// Group 2 — pm.iterationData.* regression tests (PM002)
// These APIs were migrated and must now SUCCEED (not throw).
// They delegate to pm.variables / pm.environment after runner injects the dataset row.
describe("pm.iterationData — graceful delegation regression (PM002)", () => {
  test("pm.iterationData.get() does not throw", async () => {
    const result = await runTest(`pm.iterationData.get("test")`, {
      global: [],
      selected: [],
    })()
    expect(result).not.toEqualLeft(expect.anything())
  })

  test("pm.iterationData.has() does not throw", async () => {
    const result = await runTest(`pm.iterationData.has("test")`, {
      global: [],
      selected: [],
    })()
    expect(result).not.toEqualLeft(expect.anything())
  })

  test("pm.iterationData.toObject() does not throw", async () => {
    const result = await runTest(`pm.iterationData.toObject()`, {
      global: [],
      selected: [],
    })()
    expect(result).not.toEqualLeft(expect.anything())
  })

  test("pm.iterationData.toJSON() does not throw", async () => {
    const result = await runTest(`pm.iterationData.toJSON()`, {
      global: [],
      selected: [],
    })()
    expect(result).not.toEqualLeft(expect.anything())
  })
})

// Group 4 — pm.visualizer.* graceful degradation (PM003)
// pm.visualizer.set() must NOT throw — it logs data to console and discards the template.
// pm.visualizer.clear() must NOT throw — it is a silent no-op.
describe("pm.visualizer — graceful degradation (PM003)", () => {
  test("pm.visualizer.set() does not throw in test script", async () => {
    const result = await runTest(
      `pm.visualizer.set("<h1>{{title}}</h1>", { title: "Hello" })`,
      { global: [], selected: [] }
    )()
    expect(result).not.toEqualLeft(expect.anything())
  })

  test("pm.visualizer.set() does not throw in pre-request script", () => {
    return expect(
      runPreRequest(`pm.visualizer.set("<h1>Test</h1>", { key: "value" })`, {
        global: [],
        selected: [],
      })()
    ).resolves.not.toEqualLeft(expect.anything())
  })

  test("pm.visualizer.clear() does not throw in test script", async () => {
    const result = await runTest(`pm.visualizer.clear()`, {
      global: [],
      selected: [],
    })()
    expect(result).not.toEqualLeft(expect.anything())
  })

  test("pm.visualizer.clear() does not throw in pre-request script", () => {
    return expect(
      runPreRequest(`pm.visualizer.clear()`, {
        global: [],
        selected: [],
      })()
    ).resolves.not.toEqualLeft(expect.anything())
  })
})
