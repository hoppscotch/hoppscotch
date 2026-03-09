import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

// Unified test data for unsupported APIs
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
    api: "pm.collectionVariables.get()",
    script: 'pm.collectionVariables.get("test")',
    errorMessage:
      "pm.collectionVariables.get() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.set()",
    script: 'pm.collectionVariables.set("key", "value")',
    errorMessage:
      "pm.collectionVariables.set() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.unset()",
    script: 'pm.collectionVariables.unset("key")',
    errorMessage:
      "pm.collectionVariables.unset() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.has()",
    script: 'pm.collectionVariables.has("key")',
    errorMessage:
      "pm.collectionVariables.has() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.clear()",
    script: "pm.collectionVariables.clear()",
    errorMessage:
      "pm.collectionVariables.clear() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.toObject()",
    script: "pm.collectionVariables.toObject()",
    errorMessage:
      "pm.collectionVariables.toObject() is not supported in Hoppscotch (use environment or request variables instead)",
  },
  {
    api: "pm.collectionVariables.replaceIn()",
    script: 'pm.collectionVariables.replaceIn("{{var}}")',
    errorMessage:
      "pm.collectionVariables.replaceIn() is not supported in Hoppscotch (use environment or request variables instead)",
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
    api: "pm.iterationData.get()",
    script: 'pm.iterationData.get("test")',
    errorMessage:
      "pm.iterationData.get() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.iterationData.set()",
    script: 'pm.iterationData.set("key", "value")',
    errorMessage:
      "pm.iterationData.set() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.iterationData.unset()",
    script: 'pm.iterationData.unset("key")',
    errorMessage:
      "pm.iterationData.unset() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.iterationData.has()",
    script: 'pm.iterationData.has("key")',
    errorMessage:
      "pm.iterationData.has() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.iterationData.toObject()",
    script: "pm.iterationData.toObject()",
    errorMessage:
      "pm.iterationData.toObject() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.iterationData.toJSON()",
    script: "pm.iterationData.toJSON()",
    errorMessage:
      "pm.iterationData.toJSON() is not supported in Hoppscotch (Collection Runner feature)",
  },
  {
    api: "pm.execution.setNextRequest()",
    script: 'pm.execution.setNextRequest("next-request")',
    errorMessage:
      "pm.execution.setNextRequest() is not supported in Hoppscotch (Collection Runner feature)",
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
    api: "pm.visualizer.set()",
    script: 'pm.visualizer.set("<h1>Test</h1>")',
    errorMessage:
      "pm.visualizer.set() is not supported in Hoppscotch (Postman Visualizer feature)",
  },
  {
    api: "pm.visualizer.clear()",
    script: "pm.visualizer.clear()",
    errorMessage:
      "pm.visualizer.clear() is not supported in Hoppscotch (Postman Visualizer feature)",
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

  test("pm.collectionVariables.get() throws error", async () => {
    await expect(
      runTest(`pm.collectionVariables.get("test")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.collectionVariables.get() is not supported")
    )
  })

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

  test("pm.iterationData.get() throws error", async () => {
    await expect(
      runTest(`pm.iterationData.get("test")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.iterationData.get() is not supported")
    )
  })

  test("pm.execution.setNextRequest() throws error", async () => {
    await expect(
      runTest(`pm.execution.setNextRequest("next-request")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.execution.setNextRequest() is not supported")
    )
  })

  test("pm.visualizer.set() throws error", async () => {
    await expect(
      runTest(`pm.visualizer.set("<h1>Test</h1>")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.visualizer.set() is not supported")
    )
  })

  test("pm.visualizer.clear() throws error", async () => {
    await expect(
      runTest(`pm.visualizer.clear()`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.visualizer.clear() is not supported")
    )
  })
})
