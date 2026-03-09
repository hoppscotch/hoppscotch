import { describe, expect, test } from "vitest"
import { runTest, fakeResponse } from "~/utils/test-helpers"

/**
 * Test runner behavior across all namespaces (pw, hopp, pm)
 *
 * This test suite validates:
 * 1. Syntax error handling - all namespaces throw on invalid syntax
 * 2. Async/await support - test functions can be async
 * 3. Postman compatibility - pm.test matches Postman behavior
 *
 * IMPORTANT: Test Result Structure
 * Test results follow this hierarchy:
 * {
 *   descriptor: "root",
 *   expectResults: [],        // Empty at root level
 *   children: [{              // Actual test results in children
 *     descriptor: "test name",
 *     expectResults: [...],   // Test expectations here
 *   }]
 * }
 *
 * This structure change ensures proper test descriptor nesting and matches
 * the TestDescriptor type: { descriptor, expectResults, children }
 */

// Test data for namespace-specific syntax
const namespaces = [
  { name: "pw", envArgs: fakeResponse, equalSyntax: "toBe" },
  { name: "hopp", envArgs: fakeResponse, equalSyntax: "toBe" },
  {
    name: "pm",
    envArgs: { global: [], selected: [] },
    equalSyntax: "to.equal",
  },
] as const

describe("Test Runner - All Namespaces", () => {
  describe.each(namespaces)("$name.test", ({ name, envArgs, equalSyntax }) => {
    test("returns a resolved promise for a valid test script with all green", () => {
      const script = `
        ${name}.test("Arithmetic operations", () => {
          const size = 500 + 500;
          ${name}.expect(size).${equalSyntax}(1000);
          ${name}.expect(size - 500).${equalSyntax}(500);
          ${name}.expect(size * 4).${equalSyntax}(4000);
          ${name}.expect(size / 4).${equalSyntax}(250);
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeRight()
    })

    test("resolves for tests with failed expectations", () => {
      const script = `
        ${name}.test("Arithmetic operations", () => {
          const size = 500 + 500;
          ${name}.expect(size).${equalSyntax}(1000);
          ${name}.expect(size - 500).not.${equalSyntax}(500);
          ${name}.expect(size * 4).${equalSyntax}(4000);
          ${name}.expect(size / 4).not.${equalSyntax}(250);
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeRight()
    })

    test("rejects for invalid syntax on tests", () => {
      const script = `
        ${name}.test("Arithmetic operations", () => {
          const size = 500 + 500;
          ${name}.expect(size).
          ${name}.expect(size - 500).not.${equalSyntax}(500);
          ${name}.expect(size * 4).${equalSyntax}(4000);
          ${name}.expect(size / 4).not.${equalSyntax}(250);
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeLeft()
    })

    test("supports async test functions", () => {
      const script = `
        ${name}.test("Async test", async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          ${name}.expect(1 + 1).${equalSyntax}(2);
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeRight()
    })

    test("rejects for syntax errors in async tests", () => {
      const script = `
        ${name}.test("Async test with error", async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          ${name}.expect(1 + 1).
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeLeft()
    })

    test("rejects for undefined variable in test", () => {
      const script = `
        ${name}.test("Test with undefined variable", () => {
          ${name}.expect(undefinedVariable).${equalSyntax}(1);
        });
      `

      return expect(
        runTest(script, envArgs, fakeResponse)()
      ).resolves.toBeLeft()
    })
  })

  /**
   * Postman Compatibility Tests
   *
   * These tests validate that validation assertions like jsonSchema()
   * and jsonPath() throw errors when validation fails, causing the script to fail.
   *
   * This matches the original behavior where validation failures are treated
   * the same as other assertion failures.
   */
  describe("pm.test - Validation assertions", () => {
    test("jsonSchema failures should record failed assertion", () => {
      // Postman behavior: jsonSchema validation failures are recorded as failed assertions
      // but don't throw errors or fail the script
      const response = {
        status: 200,
        statusText: "OK",
        body: JSON.stringify({ name: "John" }), // Missing 'age' property
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
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Missing required property",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining(
                    "Required property 'age' is missing"
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("jsonPath failures should record failed assertion", () => {
      // Postman behavior: jsonPath validation failures are recorded as failed assertions
      // but don't throw errors or fail the script (same as jsonSchema)
      const response = {
        status: 200,
        statusText: "OK",
        body: JSON.stringify({ name: "John" }),
        headers: [{ key: "Content-Type", value: "application/json" }],
      }

      return expect(
        runTest(
          `
            pm.test("Path doesn't exist", function() {
              pm.response.to.have.jsonPath("$.nonexistent")
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
              descriptor: "Path doesn't exist",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining(
                    "Property 'nonexistent' not found"
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Cross-namespace consistency", () => {
    test("all namespaces reject syntax errors consistently", () => {
      return Promise.all(
        namespaces.map(({ name, envArgs }) => {
          const script = `
            ${name}.test("Syntax error test", () => {
              const value = 42;
              ${name}.expect(value).
            });
          `

          return expect(
            runTest(script, envArgs, fakeResponse)()
          ).resolves.toBeLeft()
        })
      )
    })

    test("all namespaces support async test functions", () => {
      return Promise.all(
        namespaces.map(({ name, envArgs, equalSyntax }) => {
          const script = `
            ${name}.test("Async test", async () => {
              await new Promise(resolve => setTimeout(resolve, 5));
              ${name}.expect(2 + 2).${equalSyntax}(4);
            });
          `

          return expect(
            runTest(script, envArgs, fakeResponse)()
          ).resolves.toBeRight()
        })
      )
    })

    test("all namespaces handle undefined variables consistently", () => {
      return Promise.all(
        namespaces.map(({ name, envArgs, equalSyntax }) => {
          const script = `
            ${name}.test("Undefined variable", () => {
              ${name}.expect(nonExistentVar).${equalSyntax}(1);
            });
          `

          return expect(
            runTest(script, envArgs, fakeResponse)()
          ).resolves.toBeLeft()
        })
      )
    })
  })
})
