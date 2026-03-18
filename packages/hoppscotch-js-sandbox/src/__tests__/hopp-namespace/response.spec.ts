import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/web"
import { TestResponse } from "~/types"

const defaultRequest = getDefaultRESTRequest()

const sampleHeaders = [
  { key: "content-type", value: "application/json" },
  { key: "x-custom", value: "hello" },
]

const sampleJSONResponse: TestResponse = {
  status: 201,
  body: { ok: true, msg: "success" },
  headers: sampleHeaders,
  statusText: "Created",
  responseTime: 123,
}

const sampleTextResponse: TestResponse = {
  status: 200,
  body: "Plaintext response",
  headers: [{ key: "content-type", value: "text/plain" }],
  statusText: "OK",
  responseTime: 240,
}

describe("hopp.response", () => {
  test("hopp.response.statusCode should return the status", async () => {
    await expect(
      runTestScript(`hopp.expect(hopp.response.statusCode).toBe(201)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [],
        envs: expect.objectContaining({
          global: [],
          selected: [],
        }),
        tests: expect.objectContaining({
          children: [],
          descriptor: "root",
          expectResults: [
            { status: "pass", message: "Expected '201' to be '201'" },
          ],
        }),
        updatedCookies: null,
      })
    )
  })

  test("hopp.response.statusText should return the status text", async () => {
    await expect(
      runTestScript(`hopp.expect(hopp.response.statusText).toBe("Created")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'Created' to be 'Created'" },
          ],
        }),
      })
    )
  })

  test("hopp.response.responseTime should return the response time", async () => {
    await expect(
      runTestScript(`hopp.expect(hopp.response.responseTime).toBe(123)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [],
        envs: expect.objectContaining({
          global: [],
          selected: [],
        }),
        tests: expect.objectContaining({
          children: [],
          descriptor: "root",
          expectResults: [
            { status: "pass", message: "Expected '123' to be '123'" },
          ],
        }),
        updatedCookies: null,
      })
    )
  })

  test("hopp.response.headers should return all headers", async () => {
    await expect(
      runTestScript(
        `
        hopp.expect(hopp.response.headers.length).toBe(2)
        hopp.expect(hopp.response.headers[0].key).toBe("content-type")
        hopp.expect(hopp.response.headers[0].value).toBe("application/json")
        hopp.expect(hopp.response.headers[1].key).toBe("x-custom")
        hopp.expect(hopp.response.headers[1].value).toBe("hello")
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [],
        envs: expect.objectContaining({
          global: [],
          selected: [],
        }),
        tests: expect.objectContaining({
          children: [],
          descriptor: "root",
          expectResults: [
            { status: "pass", message: "Expected '2' to be '2'" },
            {
              status: "pass",
              message: "Expected 'content-type' to be 'content-type'",
            },
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            { status: "pass", message: "Expected 'x-custom' to be 'x-custom'" },
            { status: "pass", message: "Expected 'hello' to be 'hello'" },
          ],
        }),
        updatedCookies: null,
      })
    )
  })

  test("hopp.response.body.asText returns response text", async () => {
    await expect(
      runTestScript(
        `hopp.expect(hopp.response.body.asText()).toBe("Plaintext response")`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleTextResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message:
                "Expected 'Plaintext response' to be 'Plaintext response'",
            },
          ],
        }),
      })
    )
  })

  test("hopp.response.body.asJSON returns parsed object for JSON response", async () => {
    await expect(
      runTestScript(
        `
        const obj = hopp.response.body.asJSON()
        hopp.expect(obj.ok).toBe(true)
        hopp.expect(obj.msg).toBe("success")
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
            {
              status: "pass",
              message: "Expected 'success' to be 'success'",
            },
          ],
        }),
      })
    )
  })

  test("hopp.response.body.asJSON throws for invalid JSON", async () => {
    await expect(
      runTestScript(`hopp.response.body.asJSON()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleTextResponse, // text, not JSON
      })
    ).resolves.toBeLeft()
  })

  test("hopp.response.body.asJSON throws error for invalid JSON body", async () => {
    await expect(
      runTestScript(`hopp.response.body.asJSON()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: {
          ...sampleJSONResponse,
          body: "not a json!",
          headers: [{ key: "content-type", value: "application/json" }],
        },
      })
    ).resolves.toBeLeft()
  })

  test("hopp.response.body.bytes returns UTF-8 encoded data for JSON body", async () => {
    await expect(
      runTestScript(
        `
        const obj = hopp.response.body.bytes()
        hopp.expect(obj["0"]).toBe(123)
        hopp.expect(obj["1"]).toBe(34)
        hopp.expect(obj["2"]).toBe(111)
        hopp.expect(obj["26"]).toBe(125)
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '123' to be '123'",
            },
            {
              status: "pass",
              message: "Expected '34' to be '34'",
            },
            {
              status: "pass",
              message: "Expected '111' to be '111'",
            },
            {
              status: "pass",
              message: "Expected '125' to be '125'",
            },
          ],
        }),
      })
    )
  })

  test("hopp.response.body.bytes throws error for unsupported body type", async () => {
    await expect(
      runTestScript(`hopp.response.body.bytes()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: { ...sampleTextResponse, body: 1234 as any },
      })
    ).resolves.toBeLeft()
  })

  test("hopp.response.bytes returns UTF-8 encoded data for plain text", async () => {
    await expect(
      runTestScript(
        `
      const bytes = hopp.response.body.bytes()
      hopp.expect(bytes["0"]).toBe(80)
      hopp.expect(bytes["1"]).toBe(108)
      hopp.expect(bytes["17"]).toBe(101)
      `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleTextResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '80' to be '80'",
            },
            {
              status: "pass",
              message: "Expected '108' to be '108'",
            },
            {
              status: "pass",
              message: "Expected '101' to be '101'",
            },
          ],
        }),
      })
    )
  })

  test("hopp.response.bytes returns empty array for null/undefined body", async () => {
    await expect(
      runTestScript(
        `
      const bytes = hopp.response.body.bytes()
      const bytesArray = Array.from(bytes)
      hopp.expect(bytesArray.length).toBe(0)
      `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: { ...sampleTextResponse, body: null },
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '0' to be '0'",
            },
          ],
        }),
      })
    )
  })

  // Response property immutability tests
  describe("property immutability", () => {
    const baseResponse: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
      statusText: "OK",
      responseTime: 200,
    }

    test("hopp.response.statusCode should be read-only", async () => {
      const script = `
        hopp.response.statusCode = 500
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.statusText should be read-only", async () => {
      const script = `
        hopp.response.statusText = "Modified"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.headers should be read-only", async () => {
      const script = `
        hopp.response.headers = {}
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.responseTime should be read-only", async () => {
      const script = `
        hopp.response.responseTime = 1000
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.body should be read-only", async () => {
      const script = `
        hopp.response.body = null
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.body.asJSON should be read-only", async () => {
      const script = `
        hopp.response.body.asJSON = null
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.body.asText should be read-only", async () => {
      const script = `
        hopp.response.body.asText = null
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.response.body.bytes should be read-only", async () => {
      const script = `
        hopp.response.body.bytes = null
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: baseResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })
  })

  describe("hopp.response utility methods", () => {
    test("hopp.response.text() should return response as text", async () => {
      await expect(
        runTestScript(
          `hopp.expect(hopp.response.text()).toBe("Plaintext response")`,
          {
            envs: { global: [], selected: [] },
            request: defaultRequest,
            response: sampleTextResponse,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: [
              {
                status: "pass",
                message:
                  "Expected 'Plaintext response' to be 'Plaintext response'",
              },
            ],
          }),
        })
      )
    })

    test("hopp.response.json() should parse JSON response", async () => {
      await expect(
        runTestScript(`hopp.expect(hopp.response.json().ok).toBe(true)`, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        })
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: [
              { status: "pass", message: "Expected 'true' to be 'true'" },
            ],
          }),
        })
      )
    })

    test("hopp.response.reason() should return HTTP reason phrase", async () => {
      await expect(
        runTestScript(`hopp.expect(hopp.response.reason()).toBe("OK")`, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleTextResponse,
        })
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: [
              { status: "pass", message: "Expected 'OK' to be 'OK'" },
            ],
          }),
        })
      )
    })

    test("hopp.response.dataURI() should convert response to data URI", async () => {
      await expect(
        runTestScript(
          `
            const dataURI = hopp.response.dataURI()
            hopp.expect(dataURI).toBeType("string")
            hopp.expect(dataURI.startsWith("data:")).toBe(true)
          `,
          {
            envs: { global: [], selected: [] },
            request: defaultRequest,
            response: sampleJSONResponse,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        })
      )
    })

    test("hopp.response.jsonp() should parse JSONP response", async () => {
      const jsonpResponse: TestResponse = {
        status: 200,
        body: 'callback({"data": "test"})',
        headers: [{ key: "Content-Type", value: "application/javascript" }],
        statusText: "OK",
        responseTime: 100,
      }

      await expect(
        runTestScript(
          `hopp.expect(hopp.response.jsonp("callback").data).toBe("test")`,
          {
            envs: { global: [], selected: [] },
            request: defaultRequest,
            response: jsonpResponse,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: [
              { status: "pass", message: "Expected 'test' to be 'test'" },
            ],
          }),
        })
      )
    })

    test("hopp.response.jsonp() should handle plain JSON without callback", async () => {
      const plainJSONResponse: TestResponse = {
        status: 200,
        body: '{"plain": "json"}',
        headers: [{ key: "Content-Type", value: "application/json" }],
        statusText: "OK",
        responseTime: 100,
      }

      await expect(
        runTestScript(`hopp.expect(hopp.response.jsonp().plain).toBe("json")`, {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: plainJSONResponse,
        })
      ).resolves.toEqualRight(
        expect.objectContaining({
          tests: expect.objectContaining({
            expectResults: [
              { status: "pass", message: "Expected 'json' to be 'json'" },
            ],
          }),
        })
      )
    })
  })
})
