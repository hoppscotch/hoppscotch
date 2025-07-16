import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  body: JSON.stringify({ message: "Hello, World!" }),
  headers: [
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer token123" },
  ],
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

describe("pm.response", () => {
  test("pm.response.code provides access to status code", () => {
    return expect(
      func(
        `
          const code = pm.response.code
          pw.expect(code.toString()).toBe("200")
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
            message: "Expected '200' to be '200'",
          },
        ],
      }),
    ])
  })

  test("pm.response.status provides access to status text", () => {
    return expect(
      func(
        `
          const status = pm.response.status
          pw.expect(status).toBe("OK")
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
            message: "Expected 'OK' to be 'OK'",
          },
        ],
      }),
    ])
  })

  test("pm.response.text() provides response body as text", () => {
    return expect(
      func(
        `
          const text = pm.response.text()
          pw.expect(text).toBe('{"message":"Hello, World!"}')
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
              'Expected \'{"message":"Hello, World!"}\' to be \'{"message":"Hello, World!"}\'',
          },
        ],
      }),
    ])
  })

  test("pm.response.json() provides parsed JSON response", () => {
    return expect(
      func(
        `
          const json = pm.response.json()
          pw.expect(json.message).toBe("Hello, World!")
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
            message: "Expected 'Hello, World!' to be 'Hello, World!'",
          },
        ],
      }),
    ])
  })

  test("pm.response.headers provides access to response headers", () => {
    return expect(
      func(
        `
          const headers = pm.response.headers
          pw.expect(headers.get("Content-Type")).toBe("application/json")
          pw.expect(headers.get("Authorization")).toBe("Bearer token123")
          pw.expect(headers.get("nonexistent")).toBe(null)
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
            message: "Expected 'application/json' to be 'application/json'",
          },
          {
            status: "pass",
            message: "Expected 'Bearer token123' to be 'Bearer token123'",
          },
          {
            status: "pass",
            message: "Expected 'null' to be 'null'",
          },
        ],
      }),
    ])
  })

  test("pm.response object has correct structure and values", () => {
    return expect(
      func(
        `
          pw.expect(pm.response.code).toBe(200)
          pw.expect(pm.response.status).toBe("OK")
          pw.expect(pm.response.text()).toBe('{"message":"Hello, World!"}')
          pw.expect(pm.response.json().message).toBe("Hello, World!")
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
            message: "Expected '200' to be '200'",
          },
          {
            status: "pass",
            message: "Expected 'OK' to be 'OK'",
          },
          {
            status: "pass",
            message:
              'Expected \'{"message":"Hello, World!"}\' to be \'{"message":"Hello, World!"}\'',
          },
          {
            status: "pass",
            message: "Expected 'Hello, World!' to be 'Hello, World!'",
          },
        ],
      }),
    ])
  })
})
