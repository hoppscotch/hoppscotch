import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

// APIs that still throw — Group 7 (pm.vault, pm.require) not yet implemented this sprint
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
    api: "pm.require()",
    script: 'pm.require("@team/package")',
    errorMessage:
      "pm.require('@team/package') is not supported in Hoppscotch (Package Library feature)",
  },
]

describe("pm namespace - unsupported features", () => {
  test.each(unsupportedApis)(
    "$api throws error in pre-request script",
    ({ script, errorMessage }) => {
      return expect(
        runPreRequest(script, { global: [], selected: [] })()
      ).resolves.toEqualLeft(`Script execution failed: Error: ${errorMessage}`)
    }
  )

  test.each(unsupportedApis)(
    "$api throws error in test script",
    async ({ script, errorMessage }) => {
      const result = await runTest(script, { global: [], selected: [] })()
      expect(result).toEqualLeft(
        expect.stringContaining(
          `Script execution failed: Error: ${errorMessage}`
        )
      )
    }
  )
})

// Group 2 — pm.iterationData.* regression tests (PM002)
describe("pm.iterationData — graceful delegation regression (PM002)", () => {
  test("pm.iterationData.get() does not throw", async () => {
    expect(await runTest(`pm.iterationData.get("test")`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.iterationData.has() does not throw", async () => {
    expect(await runTest(`pm.iterationData.has("test")`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.iterationData.toObject() does not throw", async () => {
    expect(await runTest(`pm.iterationData.toObject()`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.iterationData.toJSON() does not throw", async () => {
    expect(await runTest(`pm.iterationData.toJSON()`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
})

// Group 4 — pm.visualizer.* graceful degradation (PM003)
describe("pm.visualizer — graceful degradation (PM003)", () => {
  test("pm.visualizer.set() does not throw in test script", async () => {
    expect(await runTest(`pm.visualizer.set("<h1>{{title}}</h1>", { title: "Hello" })`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.visualizer.set() does not throw in pre-request script", () => {
    return expect(runPreRequest(`pm.visualizer.set("<h1>Test</h1>", { key: "value" })`, { global: [], selected: [] })()).resolves.not.toEqualLeft(expect.anything())
  })
  test("pm.visualizer.clear() does not throw in test script", async () => {
    expect(await runTest(`pm.visualizer.clear()`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.visualizer.clear() does not throw in pre-request script", () => {
    return expect(runPreRequest(`pm.visualizer.clear()`, { global: [], selected: [] })()).resolves.not.toEqualLeft(expect.anything())
  })
})

// Group 6 — Execution Control graceful degradation (PM005, PM006)
describe("pm.execution — graceful degradation (PM005, PM006)", () => {
  test("pm.execution.skipRequest() does not throw in test script", async () => {
    expect(await runTest(`pm.execution.skipRequest()`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.execution.skipRequest() does not throw in pre-request script", () => {
    return expect(runPreRequest(`pm.execution.skipRequest()`, { global: [], selected: [] })()).resolves.not.toEqualLeft(expect.anything())
  })
  test("pm.execution.runRequest() does not throw in test script", async () => {
    expect(await runTest(`pm.execution.runRequest("some-request-id")`, { global: [], selected: [] })()).not.toEqualLeft(expect.anything())
  })
  test("pm.execution.runRequest() does not throw in pre-request script", () => {
    return expect(runPreRequest(`pm.execution.runRequest("some-request-id")`, { global: [], selected: [] })()).resolves.not.toEqualLeft(expect.anything())
  })
})
