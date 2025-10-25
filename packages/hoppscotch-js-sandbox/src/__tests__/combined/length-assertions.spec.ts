import { describe, expect, test } from "vitest"
import { TestResponse } from "~/types"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)("%s.expect() - Length Assertions", (namespace) => {
  const mockResponse: TestResponse = {
    status: 200,
    statusText: "OK",
    responseTime: 100,
    headers: [{ key: "content-type", value: "application/json" }],
    body: {
      items: ["apple", "banana", "cherry"],
      emptyArray: [],
      singleItem: ["solo"],
      data: {
        nested: {
          values: [1, 2, 3, 4, 5],
        },
      },
    },
  }

  describe(".length getter - Basic comparison methods", () => {
    test("should support .length.above() for arrays", async () => {
      const testScript = `
        ${namespace}.test("length.above()", () => {
          ${namespace}.expect([1, 2, 3, 4]).to.have.length.above(3);
          ${namespace}.expect([1, 2]).to.not.have.length.above(5);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length.above()",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("should support .length.above() for strings", async () => {
      const testScript = `
        ${namespace}.test("string length.above()", () => {
          ${namespace}.expect('hello world').to.have.length.above(5);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "string length.above()",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support .length.below() for arrays", async () => {
      const testScript = `
        ${namespace}.test("length.below()", () => {
          ${namespace}.expect([1, 2]).to.have.length.below(5);
          ${namespace}.expect([1, 2, 3, 4]).to.not.have.length.below(3);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length.below()",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("should support .length.within() for range checks", async () => {
      const testScript = `
        ${namespace}.test("length.within()", () => {
          ${namespace}.expect([1, 2, 3]).to.have.length.within(2, 5);
          ${namespace}.expect('test').to.have.length.within(1, 10);
          ${namespace}.expect([1]).to.not.have.length.within(5, 10);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length.within()",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".length.at.least() and .length.at.most() - Postman chain syntax", () => {
    test("should pass when array length meets minimum (.at.least)", async () => {
      const script = `
        ${namespace}.test("Array length at least", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.length.at.least(1)
          ${namespace}.expect(items).to.have.length.at.least(3)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Array length at least",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail when array length below minimum (.at.least)", async () => {
      const script = `
        ${namespace}.test("Array too short", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.length.at.least(10)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Array too short",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should pass when array length within maximum (.at.most)", async () => {
      const script = `
        ${namespace}.test("Array length at most", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.length.at.most(10)
          ${namespace}.expect(items).to.have.length.at.most(3)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Array length at most",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail when array length exceeds maximum (.at.most)", async () => {
      const script = `
        ${namespace}.test("Array too long", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.length.at.most(2)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Array too long",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".length.least() and .length.most() - Direct methods without .at", () => {
    test("should support .length.least() without .at chain", async () => {
      const script = `
        ${namespace}.test("Direct least", () => {
          ${namespace}.expect([1, 2, 3]).to.have.length.least(1)
          ${namespace}.expect([1, 2, 3]).to.have.length.least(3)
        })
      `

      const result = await runTest(script, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Direct least",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support mixed syntax with and without .at", async () => {
      const script = `
        ${namespace}.test("Mixed syntax", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.length.least(1)
          ${namespace}.expect(items).to.have.length.at.least(1)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Mixed syntax",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".length.gte() and .length.lte() - Aliases", () => {
    test("should support .length.gte() as alias for .least()", async () => {
      const script = `
        ${namespace}.test("GTE alias", () => {
          ${namespace}.expect([1, 2, 3]).to.have.length.gte(3)
          ${namespace}.expect([1, 2, 3]).to.have.length.gte(1)
        })
      `

      const result = await runTest(script, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "GTE alias",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support .length.lte() as alias for .most()", async () => {
      const script = `
        ${namespace}.test("LTE alias", () => {
          ${namespace}.expect([1, 2, 3]).to.have.length.lte(3)
          ${namespace}.expect([1, 2, 3]).to.have.length.lte(10)
        })
      `

      const result = await runTest(script, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "LTE alias",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".length(n) - Callable method for exact length", () => {
    test("should support .length(n) as method for exact length", async () => {
      const testScript = `
        ${namespace}.test("length as method", () => {
          ${namespace}.expect([1, 2, 3]).to.have.length(3);
          ${namespace}.expect('abc').to.have.length(3);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length as method",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".lengthOf(n) - Method for exact length", () => {
    test("should support .lengthOf(n) for exact length", async () => {
      const testScript = `
        ${namespace}.test("lengthOf()", () => {
          ${namespace}.expect('hello').to.have.lengthOf(5);
          ${namespace}.expect([1, 2, 3, 4, 5]).to.have.lengthOf(5);
          ${namespace}.expect('').to.have.lengthOf(0);
        });
      `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "lengthOf()",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe(".lengthOf.at.least() and .lengthOf.at.most() - Alternative syntax", () => {
    const lengthOfMockResponse: TestResponse = {
      status: 200,
      statusText: "OK",
      responseTime: 100,
      headers: [],
      body: {
        items: ["a", "b", "c", "d"],
      },
    }

    test("should support .lengthOf.at.least()", async () => {
      const script = `
        ${namespace}.test("lengthOf.at.least", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.lengthOf.at.least(1)
          ${namespace}.expect(items).to.have.lengthOf.at.least(4)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        lengthOfMockResponse
      )()

      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "lengthOf.at.least",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support .lengthOf.at.most()", async () => {
      const script = `
        ${namespace}.test("lengthOf.at.most", () => {
          const items = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.items
          ${namespace}.expect(items).to.have.lengthOf.at.most(10)
          ${namespace}.expect(items).to.have.lengthOf.at.most(4)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        lengthOfMockResponse
      )()

      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "lengthOf.at.most",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Edge cases and special scenarios", () => {
    test("should work with empty arrays", async () => {
      const script = `
        ${namespace}.test("Empty array", () => {
          const empty = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.emptyArray
          ${namespace}.expect(empty).to.have.length.at.least(0)
          ${namespace}.expect(empty).to.have.length.at.most(0)
          ${namespace}.expect(empty).to.have.length(0)
          ${namespace}.expect(empty).to.have.lengthOf(0)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Empty array",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with strings", async () => {
      const script = `
        ${namespace}.test("String length", () => {
          const str = "hello world"
          ${namespace}.expect(str).to.have.length.at.least(5)
          ${namespace}.expect(str).to.have.length.at.most(20)
          ${namespace}.expect(str).to.have.length(11)
          ${namespace}.expect(str).to.have.lengthOf(11)
        })
      `

      const result = await runTest(script, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "String length",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with nested arrays", async () => {
      const script = `
        ${namespace}.test("Nested array length", () => {
          const nested = ${namespace === "pm" ? "pm.response.json()" : "hopp.response.body.asJSON()"}.data.nested.values
          ${namespace}.expect(nested).to.have.length.at.least(5)
          ${namespace}.expect(nested).to.have.lengthOf(5)
        })
      `

      const result = await runTest(
        script,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Nested array length",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })
  })
})
