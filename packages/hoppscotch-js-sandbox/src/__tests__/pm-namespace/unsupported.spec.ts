import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pm namespace - unsupported features", () => {
  test("pm.info.iteration throws error", () => {
    return expect(
      runTest(
        `
          try {
            const iteration = pm.info.iteration
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.info.iteration is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.info.iterationCount throws error", () => {
    return expect(
      runTest(
        `
          try {
            const iterationCount = pm.info.iterationCount
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.info.iterationCount is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.collectionVariables.get() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.collectionVariables.get("test")
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.collectionVariables.get() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.vault.get() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.vault.get("test")
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.vault.get() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.iterationData.get() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.iterationData.get("test")
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.iterationData.get() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.execution.setNextRequest() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.execution.setNextRequest("next-request")
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.execution.setNextRequest() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.sendRequest() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.sendRequest("https://example.com", () => {})
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.sendRequest() is not yet implemented")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.visualizer.set() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.visualizer.set("<h1>Test</h1>")
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.visualizer.set() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.visualizer.clear() throws error", () => {
    return expect(
      runTest(
        `
          try {
            pm.visualizer.clear()
            pm.test("Should not reach here", () => {
              pm.expect(true).toBe(false)
            })
          } catch (error) {
            pm.test("Throws correct error", () => {
              pm.expect(error.message).toInclude("pm.visualizer.clear() is not supported")
            })
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Throws correct error",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })
})
