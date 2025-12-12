import {
  HoppRESTAuth,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript, runTestScript } from "~/web"
import { TestResponse } from "~/types"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://example.com/api",
  method: "GET",
  headers: [{ key: "X-Test", value: "val1", active: true, description: "" }],
  params: [{ key: "q", value: "search", active: true, description: "" }],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [{ key: "req-var-1", value: "value-1", active: true }],
  responses: {},
}

const testResponse: TestResponse = {
  status: 200,
  body: "OK",
  headers: [],
  statusText: "OK",
  responseTime: 200,
}

describe("hopp.request", () => {
  test("hopp.request basic properties are accessible from pre-request script", () => {
    const envs = { global: [], selected: [] }

    return expect(
      runPreRequestScript(
        `
        console.log("URL:", hopp.request.url);
        console.log("Method:", hopp.request.method);
        console.log("Params:", hopp.request.params);
        console.log("Headers:", hopp.request.headers);
        console.log("Body:", hopp.request.body);
        console.log("Auth:", hopp.request.auth);`,
        {
          envs,
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: ["URL:", "https://example.com/api"],
          }),
          expect.objectContaining({
            args: ["Method:", "GET"],
          }),
          expect.objectContaining({
            args: ["Params:", baseRequest.params],
          }),
          expect.objectContaining({
            args: ["Headers:", baseRequest.headers],
          }),
          expect.objectContaining({
            args: ["Body:", baseRequest.body],
          }),
          expect.objectContaining({
            args: ["Auth:", baseRequest.auth],
          }),
        ],
      })
    )
  })

  test("hopp.request properties are read-only in both pre-request and test script contexts", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "test response",
      headers: [],
    }

    // Properties that are read-only in both contexts
    const basicReadOnlyTests = [
      { property: "url", value: "'https://new-url.com'" },
      { property: "method", value: "'PUT'" },
      { property: "params", value: "[]" },
      { property: "headers", value: "[]" },
      { property: "body", value: "{}" },
      { property: "auth", value: "{}" },
    ]

    // Properties that are read-only only in test script context
    const testScriptOnlyReadOnlyTests = [{ property: "variables", value: "{}" }]

    // Test basic properties in pre-request script context
    const preRequestTests = basicReadOnlyTests.map(({ property, value }) =>
      expect(
        runPreRequestScript(`hopp.request.${property} = ${value}`, {
          envs,
          request: baseRequest,
        })
      ).resolves.toEqualLeft(
        expect.stringContaining(
          `Script execution failed: hopp.request.${property} is read-only`
        )
      )
    )

    // Test all properties in test script context
    const allReadOnlyTests = [
      ...basicReadOnlyTests,
      ...testScriptOnlyReadOnlyTests,
    ]
    const testScriptTests = allReadOnlyTests.map(({ property, value }) =>
      expect(
        runTestScript(`hopp.request.${property} = ${value}`, {
          envs,
          request: baseRequest,
          response,
        })
      ).resolves.toEqualLeft(
        expect.stringContaining(
          `Script execution failed: hopp.request.${property} is read-only`
        )
      )
    )

    return Promise.all([...preRequestTests, ...testScriptTests])
  })

  test("hopp.request.setUrl should update the URL", () => {
    return expect(
      runPreRequestScript(`hopp.request.setUrl("https://updated.com/api")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://updated.com/api",
        }),
      })
    )
  })

  test("hopp.request.setMethod should update the method (case preserved)", () => {
    return expect(
      runPreRequestScript(`hopp.request.setMethod("post")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          method: "post",
        }),
      })
    )
  })

  test("hopp.request.setHeader should update existing header case-insensitively", () => {
    return expect(
      runPreRequestScript(`hopp.request.setHeader("x-test", "updatedVal")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [
            expect.objectContaining({
              key: "X-Test",
              value: "updatedVal",
            }),
          ],
        }),
      })
    )
  })

  test("hopp.request.setHeader should add new header if not present", () => {
    return expect(
      runPreRequestScript(
        `hopp.request.setHeader("X-New-Header", "newValue")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({ key: "X-New-Header", value: "newValue" }),
          ]),
        }),
      })
    )
  })

  test("hopp.request.removeHeader should remove a header", () => {
    return expect(
      runPreRequestScript(`hopp.request.removeHeader("X-Test")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [],
        }),
      })
    )
  })

  test("hopp.request.setParam should update existing param case-insensitively", () => {
    return expect(
      runPreRequestScript(`hopp.request.setParam("Q", "updatedParam")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [
            expect.objectContaining({ key: "q", value: "updatedParam" }),
          ],
        }),
      })
    )
  })

  test("hopp.request.setParam should add new param if absent", () => {
    return expect(
      runPreRequestScript(`hopp.request.setParam("newParam", "value")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: expect.arrayContaining([
            expect.objectContaining({ key: "newParam", value: "value" }),
          ]),
        }),
      })
    )
  })

  test("hopp.request.removeParam should remove a param", () => {
    return expect(
      runPreRequestScript(`hopp.request.removeParam("q")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [],
        }),
      })
    )
  })

  test("hopp.request.setBody should update the body with complete replacement", () => {
    const newBody: HoppRESTReqBody = {
      contentType: "application/json",
      body: JSON.stringify({ changed: true }),
    }
    return expect(
      runPreRequestScript(`hopp.request.setBody(${JSON.stringify(newBody)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: newBody,
        }),
      })
    )
  })

  test("hopp.request.setBody should support partial merge", () => {
    // Base request with existing JSON body
    const requestWithBody: HoppRESTRequest = {
      ...baseRequest,
      body: {
        contentType: "application/json",
        body: JSON.stringify({ existing: "data", keep: true }),
      },
    }

    // Script that only updates contentType, preserving body content
    const partialUpdate = { contentType: "application/xml" }

    return expect(
      runPreRequestScript(
        `hopp.request.setBody(${JSON.stringify(partialUpdate)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithBody,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: {
            contentType: "application/xml",
            body: JSON.stringify({ existing: "data", keep: true }),
          },
        }),
      })
    )
  })

  test("hopp.request.setAuth should update the auth with complete replacement", () => {
    const newAuth: HoppRESTAuth = {
      authType: "basic",
      username: "abc",
      password: "123",
      authActive: true,
    }

    return expect(
      runPreRequestScript(`hopp.request.setAuth(${JSON.stringify(newAuth)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: newAuth,
        }),
      })
    )
  })

  test("hopp.request.setAuth should support partial merge", () => {
    // Base request with existing basic auth
    const requestWithAuth: HoppRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "basic",
        username: "original-user",
        password: "original-pass",
        authActive: true,
      },
    }

    // Script that only updates the username, preserving other fields
    const partialUpdate = { username: "updated-user" }

    return expect(
      runPreRequestScript(
        `hopp.request.setAuth(${JSON.stringify(partialUpdate)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithAuth,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: {
            authType: "basic",
            username: "updated-user",
            password: "original-pass",
            authActive: true,
          },
        }),
      })
    )
  })

  test("hopp.request.setAuth should handle auth type switching", () => {
    // Base request with bearer auth
    const requestWithBearerAuth: HoppRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "bearer",
        token: "old-bearer-token",
        authActive: true,
      },
    }

    // Switch to basic auth (complete replacement)
    const switchToBasic: HoppRESTAuth = {
      authType: "basic",
      username: "new-user",
      password: "new-pass",
      authActive: true,
    }

    return expect(
      runPreRequestScript(
        `hopp.request.setAuth(${JSON.stringify(switchToBasic)})`,
        {
          envs: { global: [], selected: [] },
          request: requestWithBearerAuth,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: switchToBasic,
        }),
      })
    )
  })

  test("hopp.request.setHeaders throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`hopp.request.setHeaders(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("hopp.request.setParams throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`hopp.request.setParams(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("hopp.request.setBody throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`hopp.request.setBody("invalid_body")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("hopp.request.setAuth throws error on invalid input", () => {
    return expect(
      runPreRequestScript(`hopp.request.setAuth({})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      })
    ).resolves.toBeLeft()
  })

  test("hopp.request.variables.get should return the request variable", () => {
    return expect(
      runPreRequestScript(
        `console.log(hopp.request.variables.get("req-var-1"))`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: ["value-1"] })],
      })
    )
  })

  test("hopp.request.variables.set should update the request variable", () => {
    return expect(
      runPreRequestScript(
        `hopp.request.variables.set("req-var-1", "new-value-1")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "new-value-1",
              active: true,
            },
          ],
        }),
      })
    )
  })

  test("hopp.request.variables.set should add a new request variable if the supplied key does not exist", () => {
    return expect(
      runPreRequestScript(
        `hopp.request.variables.set("req-var-2", "value-2")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "value-1",
              active: true,
            },
            {
              key: "req-var-2",
              value: "value-2",
              active: true,
            },
          ],
        }),
      })
    )
  })

  test("hopp.request.variables.set should not work in post-request script context", () => {
    const envs = { global: [], selected: [] }

    return expect(
      runTestScript(
        `hopp.request.variables.set("req-var-1", "new-value-from-test")`,
        {
          envs,
          request: baseRequest,
          response: testResponse,
        }
      )
    ).resolves.toEqualLeft(
      expect.stringContaining(`Script execution failed: not a function`)
    )
  })

  test("hopp.request read-only properties are accessible from post-request script", () => {
    const envs = { global: [], selected: [] }

    const testRequest: HoppRESTRequest = {
      ...baseRequest,
      method: "POST",
      endpoint: "https://api.example.com/users",
      params: [{ key: "page", value: "1", active: true, description: "" }],
      headers: [
        {
          key: "Authorization",
          value: "Bearer token123",
          active: true,
          description: "",
        },
        {
          key: "Content-Type",
          value: "application/json",
          active: true,
          description: "",
        },
      ],
      body: {
        contentType: "application/json",
        body: JSON.stringify({ name: "John", age: 30 }),
      },
      auth: {
        authType: "bearer",
        authActive: true,
        token: "test-token-123",
      },
    }

    return expect(
      runTestScript(
        `
        hopp.expect(hopp.request.url).toBe("https://api.example.com/users")
        hopp.expect(hopp.request.method).toBe("POST")
        hopp.expect(hopp.request.params.length).toBe(1)
        hopp.expect(hopp.request.params[0].key).toBe("page")
        hopp.expect(hopp.request.params[0].value).toBe("1")
        hopp.expect(hopp.request.headers.length).toBe(2)
        hopp.expect(hopp.request.headers[0].key).toBe("Authorization")
        hopp.expect(hopp.request.headers[0].value).toBe("Bearer token123")
        hopp.expect(hopp.request.headers[1].key).toBe("Content-Type")
        hopp.expect(hopp.request.headers[1].value).toBe("application/json")
        hopp.expect(hopp.request.body.contentType).toBe("application/json")
        hopp.expect(hopp.request.body.body).toBe('{"name":"John","age":30}')
        hopp.expect(hopp.request.auth.authType).toBe("bearer")
        hopp.expect(hopp.request.auth.token).toBe("test-token-123")
        `,
        {
          envs,
          request: testRequest,
          response: testResponse,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message:
                "Expected 'https://api.example.com/users' to be 'https://api.example.com/users'",
            },
            { status: "pass", message: "Expected 'POST' to be 'POST'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected 'page' to be 'page'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected '2' to be '2'" },
            {
              status: "pass",
              message: "Expected 'Authorization' to be 'Authorization'",
            },
            {
              status: "pass",
              message: "Expected 'Bearer token123' to be 'Bearer token123'",
            },
            {
              status: "pass",
              message: "Expected 'Content-Type' to be 'Content-Type'",
            },
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            {
              status: "pass",
              message:
                'Expected \'{"name":"John","age":30}\' to be \'{"name":"John","age":30}\'',
            },
            { status: "pass", message: "Expected 'bearer' to be 'bearer'" },
            {
              status: "pass",
              message: "Expected 'test-token-123' to be 'test-token-123'",
            },
          ],
        }),
      })
    )
  })

  test("hopp.request setter methods should not be available in post-request", async () => {
    const script = `
        hopp.request.setUrl("http://modified.com")
      `

    await expect(
      runTestScript(script, {
        envs: { global: [], selected: [] },
        request: baseRequest,
        response: testResponse,
      })
    ).resolves.toEqualLeft(expect.stringContaining("not a function"))
  })

  test("hopp.request.setHeader should not be available in post-request", async () => {
    const script = `
        hopp.request.setHeader("X-Test", "value")
      `

    await expect(
      runTestScript(script, {
        envs: { global: [], selected: [] },
        request: baseRequest,
        response: testResponse,
      })
    ).resolves.toEqualLeft(expect.stringContaining("not a function"))
  })

  // Request property immutability tests in post-request context
  describe("property immutability in post-request context", () => {
    test("hopp.request.url should be read-only", async () => {
      const script = `
        hopp.request.url = "http://modified.com"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.request.method should be read-only", async () => {
      const script = `
        hopp.request.method = "POST"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.request.headers should be read-only", async () => {
      const script = `
        hopp.request.headers = {}
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })

    test("hopp.request.body should be read-only", async () => {
      const script = `
        hopp.request.body = "modified"
      `

      await expect(
        runTestScript(script, {
          envs: { global: [], selected: [] },
          request: baseRequest,
          response: testResponse,
        })
      ).resolves.toEqualLeft(expect.stringContaining("read-only"))
    })
  })

  describe("setter methods immediately reflect in console.log", () => {
    test("setUrl should reflect immediately in hopp.request.url", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.url)
          hopp.request.setUrl("https://updated.com/api")
          console.log("After:", hopp.request.url)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "https://example.com/api"],
            }),
            expect.objectContaining({
              args: ["After:", "https://updated.com/api"],
            }),
          ],
          updatedRequest: expect.objectContaining({
            endpoint: "https://updated.com/api",
          }),
        })
      )
    })

    test("setMethod should reflect immediately in hopp.request.method", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.method)
          hopp.request.setMethod("POST")
          console.log("After:", hopp.request.method)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "GET"],
            }),
            expect.objectContaining({
              args: ["After:", "POST"],
            }),
          ],
          updatedRequest: expect.objectContaining({
            method: "POST",
          }),
        })
      )
    })

    test("setHeader should reflect immediately in hopp.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          const before = hopp.request.headers.find(h => h.key === "X-Test")
          console.log("Before value:", before.value)
          hopp.request.setHeader("X-Test", "modified")
          const after = hopp.request.headers.find(h => h.key === "X-Test")
          console.log("After value:", after.value)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before value:", "val1"],
            }),
            expect.objectContaining({
              args: ["After value:", "modified"],
            }),
          ],
        })
      )
    })

    test("setHeaders should reflect immediately in hopp.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before length:", hopp.request.headers.length)
          hopp.request.setHeaders([
            { key: "X-New-1", value: "val1", active: true, description: "" },
            { key: "X-New-2", value: "val2", active: true, description: "" }
          ])
          console.log("After length:", hopp.request.headers.length)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before length:", 1],
            }),
            expect.objectContaining({
              args: ["After length:", 2],
            }),
          ],
        })
      )
    })

    test("removeHeader should reflect immediately in hopp.request.headers", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.headers.map(h => h.key))
          hopp.request.removeHeader("X-Test")
          console.log("After:", hopp.request.headers.map(h => h.key))
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", ["X-Test"]],
            }),
            expect.objectContaining({
              args: ["After:", []],
            }),
          ],
        })
      )
    })

    test("setParam should reflect immediately in hopp.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          const before = hopp.request.params.find(p => p.key === "q")
          console.log("Before value:", before.value)
          hopp.request.setParam("q", "updated")
          const after = hopp.request.params.find(p => p.key === "q")
          console.log("After value:", after.value)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before value:", "search"],
            }),
            expect.objectContaining({
              args: ["After value:", "updated"],
            }),
          ],
        })
      )
    })

    test("setParams should reflect immediately in hopp.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before length:", hopp.request.params.length)
          hopp.request.setParams([
            { key: "page", value: "1", active: true, description: "" },
            { key: "limit", value: "10", active: true, description: "" }
          ])
          console.log("After length:", hopp.request.params.length)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before length:", 1],
            }),
            expect.objectContaining({
              args: ["After length:", 2],
            }),
          ],
        })
      )
    })

    test("removeParam should reflect immediately in hopp.request.params", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.params.map(p => p.key))
          hopp.request.removeParam("q")
          console.log("After:", hopp.request.params.map(p => p.key))
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", ["q"]],
            }),
            expect.objectContaining({
              args: ["After:", []],
            }),
          ],
        })
      )
    })

    test("setBody should reflect immediately in hopp.request.body", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.body.contentType)
          hopp.request.setBody({
            contentType: "application/json",
            body: '{"test": true}'
          })
          console.log("After:", hopp.request.body.contentType)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", null],
            }),
            expect.objectContaining({
              args: ["After:", "application/json"],
            }),
          ],
        })
      )
    })

    test("setAuth should reflect immediately in hopp.request.auth", () => {
      return expect(
        runPreRequestScript(
          `
          console.log("Before:", hopp.request.auth.authType)
          hopp.request.setAuth({ authType: "bearer", token: "test-token" })
          console.log("After:", hopp.request.auth.authType)
          `,
          {
            envs: { global: [], selected: [] },
            request: baseRequest,
          }
        )
      ).resolves.toEqualRight(
        expect.objectContaining({
          consoleEntries: [
            expect.objectContaining({
              args: ["Before:", "none"],
            }),
            expect.objectContaining({
              args: ["After:", "bearer"],
            }),
          ],
        })
      )
    })
  })
})
