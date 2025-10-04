import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
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

describe("pm.request coverage", () => {
  test("pm.request object provides access to request data", () => {
    return expect(
      func(
        `
          pw.expect(pm.request.url.toString()).toBe("https://echo.hoppscotch.io")
          pw.expect(pm.request.method).toBe("GET")
          pw.expect(pm.request.headers.get("Content-Type")).toBe(null)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message:
              "Expected 'https://echo.hoppscotch.io' to be 'https://echo.hoppscotch.io'",
          },
          {
            status: "pass",
            message: "Expected 'GET' to be 'GET'",
          },
          {
            status: "pass",
            message: "Expected 'null' to be 'null'",
          },
        ],
      }),
    ])
  })

  test("pm.request.url provides correct URL value", () => {
    return expect(
      func(
        `
          pw.expect(pm.request.url.toString()).toBe("https://echo.hoppscotch.io")
          pw.expect(pm.request.url.toString().length).toBe(26)
          pw.expect(pm.request.url.toString().includes("hoppscotch")).toBe(true)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message:
              "Expected 'https://echo.hoppscotch.io' to be 'https://echo.hoppscotch.io'",
          },
          {
            status: "pass",
            message: "Expected '26' to be '26'",
          },
          {
            status: "pass",
            message: "Expected 'true' to be 'true'",
          },
        ],
      }),
    ])
  })

  test("pm.request.headers functionality", () => {
    return expect(
      func(
        `
          pw.expect(pm.request.headers.get("Content-Type")).toBe(null)
          pw.expect(pm.request.headers.has("Content-Type")).toBe(false)
          pw.expect(pm.request.headers.has("User-Agent")).toBe(false)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'null' to be 'null'",
          },
          {
            status: "pass",
            message: "Expected 'false' to be 'false'",
          },
          {
            status: "pass",
            message: "Expected 'false' to be 'false'",
          },
        ],
      }),
    ])
  })
})
