import { describe, expect, test } from "vitest"
import { TestResponse, TestResult } from "~/types"
import { runTest } from "~/utils/test-helpers"

const customResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  body: JSON.stringify({ message: "Hello, World!" }),
  headers: [
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer token123" },
  ],
}

const func = (
  script: string,
  envs: TestResult["envs"],
  response: TestResponse = customResponse
) => runTest(script, envs, response)

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
          // Postman returns undefined for non-existent headers, not null
          pw.expect(headers.get("nonexistent")).toBe(undefined)
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
            message: "Expected 'undefined' to be 'undefined'",
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

  test("pm.response.stream provides response body as Uint8Array", () => {
    return expect(
      func(
        `
          const stream = pm.response.stream
          // Verify it's a Uint8Array by checking it can be decoded
          const decoder = new TextDecoder()
          const decoded = decoder.decode(stream)
          pw.expect(decoded).toBe('{"message":"Hello, World!"}')
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

  test("pm.response.stream contains correct byte data", () => {
    return expect(
      func(
        `
          const stream = pm.response.stream
          const decoder = new TextDecoder()
          const text = decoder.decode(stream)
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

  test("pm.response.reason() returns HTTP reason phrase", () => {
    return expect(
      func(
        `
          const reason = pm.response.reason()
          pw.expect(reason).toBe("OK")
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

  test("pm.response.dataURI() converts response to data URI", () => {
    return expect(
      func(
        `
          const dataURI = pm.response.dataURI()
          pw.expect(dataURI).toBeType("string")
          // Check it starts with data: and contains base64
          const startsWithData = dataURI.startsWith("data:")
          pw.expect(startsWithData).toBe(true)
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
            message: expect.stringContaining("to be type 'string'"),
          },
          {
            status: "pass",
            message: "Expected 'true' to be 'true'",
          },
        ],
      }),
    ])
  })

  test("pm.response.jsonp() parses JSONP response", () => {
    const jsonpResponse: TestResponse = {
      status: 200,
      statusText: "OK",
      body: 'callback({"data": "test value"})',
      headers: [{ key: "Content-Type", value: "application/javascript" }],
    }

    return expect(
      func(
        `
          const data = pm.response.jsonp("callback")
          pw.expect(data.data).toBe("test value")
        `,
        { global: [], selected: [] },
        jsonpResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'test value' to be 'test value'",
          },
        ],
      }),
    ])
  })

  test("pm.response.jsonp() handles response without callback wrapper", () => {
    const jsonResponse: TestResponse = {
      status: 200,
      statusText: "OK",
      body: '{"plain": "json"}',
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      func(
        `
          const data = pm.response.jsonp()
          pw.expect(data.plain).toBe("json")
        `,
        { global: [], selected: [] },
        jsonResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'json' to be 'json'",
          },
        ],
      }),
    ])
  })
})
