import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "test response",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("pm namespace - unsupported features", () => {
  test("pm.info.iteration throws error", () => {
    return expect(
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
})
