import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`pm.response.to.have.jsonSchema` - JSON Schema Validation", () => {
  test("should validate simple type schema", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John", age: 30 }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response matches schema", function() {
            const schema = {
              type: "object",
              required: ["name", "age"],
              properties: {
                name: { type: "string" },
                age: { type: "number" }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Response matches schema",
            // Note: jsonSchema assertion currently doesn't populate expectResults
            // TODO: Enhance implementation to track individual schema validation results
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate nested object schema", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        user: {
          id: 123,
          profile: {
            name: "John",
            email: "john@example.com",
          },
        },
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Nested schema validation", function() {
            const schema = {
              type: "object",
              required: ["user"],
              properties: {
                user: {
                  type: "object",
                  required: ["id", "profile"],
                  properties: {
                    id: { type: "number" },
                    profile: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        email: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Nested schema validation",
            // Note: jsonSchema assertion currently doesn't populate expectResults
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate array schema with items", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Array schema validation", function() {
            const schema = {
              type: "array",
              items: {
                type: "object",
                required: ["id", "name"],
                properties: {
                  id: { type: "number" },
                  name: { type: "string" }
                }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Array schema validation",
            // Note: jsonSchema assertion currently doesn't populate expectResults
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate enum constraints", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ status: "active", role: "admin" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Enum validation", function() {
            const schema = {
              type: "object",
              properties: {
                status: { enum: ["active", "inactive", "pending"] },
                role: { enum: ["admin", "user", "guest"] }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Enum validation",
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate number constraints (min/max)", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ age: 25, score: 85 }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Number constraints", function() {
            const schema = {
              type: "object",
              properties: {
                age: { type: "number", minimum: 0, maximum: 120 },
                score: { type: "number", minimum: 0, maximum: 100 }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Number constraints",
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate string constraints (length, pattern)", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        username: "john123",
        email: "john@example.com",
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("String constraints", function() {
            const schema = {
              type: "object",
              properties: {
                username: { type: "string", minLength: 3, maxLength: 20 },
                email: { type: "string", pattern: "^[^@]+@[^@]+\\\\.[^@]+$" }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "String constraints",
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should validate array length constraints", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        items: [1, 2, 3],
        tags: ["tag1", "tag2"],
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Array length constraints", function() {
            const schema = {
              type: "object",
              properties: {
                items: { type: "array", minItems: 1, maxItems: 10 },
                tags: { type: "array", minItems: 1 }
              }
            }
            pm.response.to.have.jsonSchema(schema)
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
            descriptor: "Array length constraints",
            expectResults: [],
          }),
        ],
      }),
    ])
  })

  test("should fail when required property is missing", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Missing required property", function() {
            const schema = {
              type: "object",
              required: ["name", "age"],
              properties: {
                name: { type: "string" },
                age: { type: "number" }
              }
            }
            pm.response.to.have.jsonSchema(schema)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualLeft(
      expect.stringContaining("Required property 'age' is missing")
    )
  })

  test("should fail when type doesn't match", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ age: "thirty" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Wrong type", function() {
            const schema = {
              type: "object",
              properties: {
                age: { type: "number" }
              }
            }
            pm.response.to.have.jsonSchema(schema)
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualLeft(
      expect.stringContaining("Expected type number, got string")
    )
  })
})

describe("`pm.response.to.have.charset` - Charset Assertions", () => {
  test("should assert UTF-8 charset", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Hello World",
      headers: [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response has UTF-8 charset", function() {
            pm.response.to.have.charset("utf-8")
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
            descriptor: "Response has UTF-8 charset",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'utf-8' to equal 'utf-8'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should assert ISO-8859-1 charset", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Hello World",
      headers: [
        { key: "Content-Type", value: "text/plain; charset=ISO-8859-1" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Response has ISO-8859-1 charset", function() {
            pm.response.to.have.charset("iso-8859-1")
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
            descriptor: "Response has ISO-8859-1 charset",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'iso-8859-1' to equal 'iso-8859-1'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle charset case-insensitively", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Content-Type", value: "application/json; charset=UTF-8" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Charset is case-insensitive", function() {
            pm.response.to.have.charset("utf-8")
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
            descriptor: "Charset is case-insensitive",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'utf-8' to equal 'utf-8'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should fail when charset doesn't match", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Hello",
      headers: [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
    }

    return expect(
      runTest(
        `
          pm.test("Wrong charset fails", function() {
            pm.response.to.have.charset("iso-8859-1")
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
            descriptor: "Wrong charset fails",
            expectResults: [
              {
                status: "fail",
                message: expect.stringContaining(
                  "Expected 'utf-8' to equal 'iso-8859-1'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.have.jsonPath` - JSONPath Queries", () => {
  test("should query simple property", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John", age: 30 }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Query simple property", function() {
            pm.response.to.have.jsonPath("$.name", "John")
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
            descriptor: "Query simple property",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'John' to deep equal 'John'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should query nested property", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        user: {
          profile: {
            name: "John Doe",
            age: 30,
          },
        },
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Query nested property", function() {
            pm.response.to.have.jsonPath("$.user.profile.name", "John Doe")
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
            descriptor: "Query nested property",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'John Doe' to deep equal 'John Doe'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should query array element by index", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({
        items: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Query array element", function() {
            pm.response.to.have.jsonPath("$.items[0].name", "Item 1")
            pm.response.to.have.jsonPath("$.items[1].id", 2)
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
            descriptor: "Query array element",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should query without expected value (existence check)", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ user: { id: 123, name: "John" } }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Check property exists", function() {
            pm.response.to.have.jsonPath("$.user.id")
            pm.response.to.have.jsonPath("$.user.name")
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
            descriptor: "Check property exists",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should handle root path", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John", age: 30 }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Query root", function() {
            const root = pm.response.json()
            pm.response.to.have.jsonPath("$", root)
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
            descriptor: "Query root",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining("deep equal"),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should fail when path doesn't exist", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Non-existent path fails", function() {
            pm.response.to.have.jsonPath("$.nonexistent")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualLeft(
      expect.stringContaining("Property 'nonexistent' not found")
    )
  })

  test("should fail when array index is out of bounds", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ items: [1, 2, 3] }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Out of bounds index fails", function() {
            pm.response.to.have.jsonPath("$.items[10]")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualLeft(
      expect.stringContaining("Array index '10' out of bounds")
    )
  })

  test("should fail when value doesn't match", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ name: "John" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    return expect(
      runTest(
        `
          pm.test("Wrong value fails", function() {
            pm.response.to.have.jsonPath("$.name", "Jane")
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
            descriptor: "Wrong value fails",
            expectResults: [
              {
                status: "fail",
                message: expect.stringContaining(
                  "Expected 'John' to deep equal 'Jane'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })
})
