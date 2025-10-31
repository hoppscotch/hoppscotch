/**
 * @file Tests for Postman BDD-style response assertions (pm.response.to.*)
 *
 * These tests verify the Postman compatibility layer's BDD-style assertion helpers
 * which are commonly used in Postman collections. They provide syntactic sugar over
 * the standard Chai assertions for common response validation patterns.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`pm.response.to.have.*` - Status Code Assertions", () => {
  test("should support `.status()` for exact status code matching", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Status code is 200", function() {
            pm.response.to.have.status(200)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Status code is 200",
            expectResults: [
              {
                status: "pass",
                message: "Expected 200 to equal 200",
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should fail `.status()` when status code doesn't match", () => {
    const response: TestResponse = {
      status: 404,
      statusText: "Not Found",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Status code is 200", function() {
            pm.response.to.have.status(200)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Status code is 200",
            expectResults: [
              {
                status: "fail",
                message: expect.stringContaining("Expected 404 to equal 200"),
              },
            ],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.be.*` - Status Code Convenience Methods", () => {
  test("should support `.ok()` for 2xx status codes", () => {
    const responses = [
      { status: 200, statusText: "OK" },
      { status: 201, statusText: "Created" },
      { status: 204, statusText: "No Content" },
    ]

    return Promise.all(
      responses.map((r) =>
        expect(
          runTest(
            `
              pm.test("Response is OK", function() {
                pm.response.to.be.ok()
              })
            `,
            { global: [], selected: [] },
            { ...r, body: "{}", headers: [] }
          )()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                expectResults: [
                  { status: "pass", message: expect.any(String) },
                ],
              }),
            ],
          }),
        ])
      )
    )
  })

  test("should fail `.ok()` for non-2xx status codes", () => {
    const response: TestResponse = {
      status: 404,
      statusText: "Not Found",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Response is OK", function() {
            pm.response.to.be.ok()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              {
                status: "fail",
                message: expect.any(String),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should support `.accepted()` for 202 status code", () => {
    const response: TestResponse = {
      status: 202,
      statusText: "Accepted",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Request accepted", function() {
            pm.response.to.be.accepted()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.badRequest()` for 400 status code", () => {
    const response: TestResponse = {
      status: 400,
      statusText: "Bad Request",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Bad request error", function() {
            pm.response.to.be.badRequest()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.unauthorized()` for 401 status code", () => {
    const response: TestResponse = {
      status: 401,
      statusText: "Unauthorized",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Unauthorized error", function() {
            pm.response.to.be.unauthorized()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.forbidden()` for 403 status code", () => {
    const response: TestResponse = {
      status: 403,
      statusText: "Forbidden",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Forbidden error", function() {
            pm.response.to.be.forbidden()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.notFound()` for 404 status code", () => {
    const response: TestResponse = {
      status: 404,
      statusText: "Not Found",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Not found error", function() {
            pm.response.to.be.notFound()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.rateLimited()` for 429 status code", () => {
    const response: TestResponse = {
      status: 429,
      statusText: "Too Many Requests",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Rate limited", function() {
            pm.response.to.be.rateLimited()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.serverError()` for 5xx status codes", () => {
    const responses = [
      { status: 500, statusText: "Internal Server Error" },
      { status: 502, statusText: "Bad Gateway" },
      { status: 503, statusText: "Service Unavailable" },
    ]

    return Promise.all(
      responses.map((r) =>
        expect(
          runTest(
            `
              pm.test("Server error", function() {
                pm.response.to.be.serverError()
              })
            `,
            { global: [], selected: [] },
            { ...r, body: "{}", headers: [] }
          )()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                expectResults: [
                  { status: "pass", message: expect.any(String) },
                ],
              }),
            ],
          }),
        ])
      )
    )
  })
})

describe("`pm.response.to.have.header()` - Header Assertions", () => {
  test("should check header existence", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Content-Type", value: "application/json" },
        { key: "X-Custom-Header", value: "custom-value" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Headers exist", function() {
            pm.response.to.have.header("Content-Type")
            pm.response.to.have.header("X-Custom-Header")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              { status: "pass", message: expect.any(String) },
              { status: "pass", message: expect.any(String) },
            ],
          }),
        ],
      }),
    ])
  })

  test("should check header value when specified", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Header has correct value", function() {
            pm.response.to.have.header("Content-Type", "application/json")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should be case-insensitive for header names", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Case insensitive header check", function() {
            pm.response.to.have.header("content-type")
            pm.response.to.have.header("CONTENT-TYPE")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              { status: "pass", message: expect.any(String) },
              { status: "pass", message: expect.any(String) },
            ],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.have.body()` - Body Assertions", () => {
  test("should match exact body content", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Hello, World!",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Body matches", function() {
            pm.response.to.have.body("Hello, World!")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.have.jsonBody()` - JSON Body Assertions", () => {
  test("should assert response is JSON object when called without arguments", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ message: "Hello", count: 42 }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response is JSON", function() {
            pm.response.to.have.jsonBody()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should check for property existence when key provided", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ message: "Hello", count: 42 }),
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("JSON has properties", function() {
            pm.response.to.have.jsonBody("message")
            pm.response.to.have.jsonBody("count")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              { status: "pass", message: expect.any(String) },
              { status: "pass", message: expect.any(String) },
            ],
          }),
        ],
      }),
    ])
  })

  test("should check property value when key and value provided", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ message: "Hello", count: 42 }),
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("JSON property values match", function() {
            pm.response.to.have.jsonBody("message", "Hello")
            pm.response.to.have.jsonBody("count", 42)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              { status: "pass", message: expect.any(String) },
              { status: "pass", message: expect.any(String) },
            ],
          }),
        ],
      }),
    ])
  })

  test("should support nested property checks", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ user: { name: "Alice", age: 30 } }),
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Nested properties", function() {
            const data = pm.response.json()
            pm.expect(data.user).to.have.property("name")
            pm.expect(data.user.name).to.equal("Alice")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [
              { status: "pass", message: expect.any(String) },
              { status: "pass", message: expect.any(String) },
            ],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.be.*` - Content Type Convenience Methods", () => {
  test("should support `.json()` for JSON content type", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Content-Type", value: "application/json; charset=utf-8" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Response is JSON", function() {
            pm.response.to.be.json()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.html()` for HTML content type", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "<html></html>",
      headers: [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response is HTML", function() {
            pm.response.to.be.html()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.xml()` for XML content types", () => {
    const responses = [
      { headers: [{ key: "Content-Type", value: "application/xml" }] },
      { headers: [{ key: "Content-Type", value: "text/xml" }] },
    ]

    return Promise.all(
      responses.map((r) =>
        expect(
          runTest(
            `
              pm.test("Response is XML", function() {
                pm.response.to.be.xml()
              })
            `,
            { global: [], selected: [] },
            { status: 200, statusText: "OK", body: "<xml></xml>", ...r }
          )()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                expectResults: [
                  { status: "pass", message: expect.any(String) },
                ],
              }),
            ],
          }),
        ])
      )
    )
  })

  test("should support `.text()` for plain text content type", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Plain text response",
      headers: [{ key: "Content-Type", value: "text/plain" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response is text", function() {
            pm.response.to.be.text()
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.have.responseTime.*` - Response Time Assertions", () => {
  test("should support `.below()` for response time upper bound", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [],
      responseTime: 250,
    }

    return expect(
      runTest(
        `
          pm.test("Response time is acceptable", function() {
            pm.response.to.have.responseTime.below(500)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("should support `.above()` for response time lower bound", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [],
      responseTime: 250,
    }

    return expect(
      runTest(
        `
          pm.test("Response time is above threshold", function() {
            pm.response.to.have.responseTime.above(100)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })
})

describe("Real-world Postman script patterns", () => {
  test("should handle complex assertion combinations", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        success: true,
        data: { id: 123, name: "Test" },
        timestamp: Date.now(),
      }),
      headers: [
        { key: "Content-Type", value: "application/json" },
        { key: "X-Request-ID", value: "abc-123" },
      ],
      responseTime: 150,
    }

    return expect(
      runTest(
        `
          pm.test("API response validation", function() {
            // Status code checks
            pm.response.to.have.status(200)
            pm.response.to.be.ok()

            // Header checks
            pm.response.to.have.header("Content-Type")
            pm.response.to.have.header("X-Request-ID", "abc-123")

            // Content type
            pm.response.to.be.json()

            // JSON body checks
            pm.response.to.have.jsonBody("success", true)
            pm.response.to.have.jsonBody("data")

            // Response time
            pm.response.to.have.responseTime.below(500)

            // Detailed JSON assertions
            const json = pm.response.json()
            pm.expect(json.data.id).to.equal(123)
            pm.expect(json.data.name).to.equal("Test")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "API response validation",
            expectResults: expect.arrayContaining([
              { status: "pass", message: expect.any(String) },
            ]),
          }),
        ],
      }),
    ])
  })
})
