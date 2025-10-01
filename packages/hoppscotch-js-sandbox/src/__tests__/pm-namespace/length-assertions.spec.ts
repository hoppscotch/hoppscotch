/**
 * Comprehensive Length Assertions Test Suite
 *
 * This file consolidates all length-related assertion tests for PM and Hopp namespaces.
 * Covers:
 * - .length getter with comparison methods (.above, .below, .within, .least, .most, .gte, .lte)
 * - .length.at.least() and .length.at.most() chain syntax
 * - .lengthOf(n) for exact length
 * - .lengthOf with comparison chains (.at.least, .at.most, etc.)
 * - .length(n) as callable method
 */

import { describe, expect, test } from "vitest"
import { TestResponse } from "~/types"
import { runTest } from "~/utils/test-helpers"

describe("PM Namespace - Length Assertions", () => {
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
        pm.test("length.above()", () => {
          pm.expect([1, 2, 3, 4]).to.have.length.above(3);
          pm.expect([1, 2]).to.not.have.length.above(5);
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
        pm.test("string length.above()", () => {
          pm.expect('hello world').to.have.length.above(5);
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
        pm.test("length.below()", () => {
          pm.expect([1, 2]).to.have.length.below(5);
          pm.expect([1, 2, 3, 4]).to.not.have.length.below(3);
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
        pm.test("length.within()", () => {
          pm.expect([1, 2, 3]).to.have.length.within(2, 5);
          pm.expect('test').to.have.length.within(1, 10);
          pm.expect([1]).to.not.have.length.within(5, 10);
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
        pm.test("Array length at least", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.length.at.least(1)
          pm.expect(items).to.have.length.at.least(3)
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
        pm.test("Array too short", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.length.at.least(10)
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
        pm.test("Array length at most", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.length.at.most(10)
          pm.expect(items).to.have.length.at.most(3)
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
        pm.test("Array too long", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.length.at.most(2)
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
        pm.test("Direct least", () => {
          pm.expect([1, 2, 3]).to.have.length.least(1)
          pm.expect([1, 2, 3]).to.have.length.least(3)
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
        pm.test("Mixed syntax", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.length.least(1)
          pm.expect(items).to.have.length.at.least(1)
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
        pm.test("GTE alias", () => {
          pm.expect([1, 2, 3]).to.have.length.gte(3)
          pm.expect([1, 2, 3]).to.have.length.gte(1)
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
        pm.test("LTE alias", () => {
          pm.expect([1, 2, 3]).to.have.length.lte(3)
          pm.expect([1, 2, 3]).to.have.length.lte(10)
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
        pm.test("length as method", () => {
          pm.expect([1, 2, 3]).to.have.length(3);
          pm.expect('abc').to.have.length(3);
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
        pm.test("lengthOf()", () => {
          pm.expect('hello').to.have.lengthOf(5);
          pm.expect([1, 2, 3, 4, 5]).to.have.lengthOf(5);
          pm.expect('').to.have.lengthOf(0);
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
        pm.test("lengthOf.at.least", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.lengthOf.at.least(1)
          pm.expect(items).to.have.lengthOf.at.least(4)
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
        pm.test("lengthOf.at.most", () => {
          const items = pm.response.json().items
          pm.expect(items).to.have.lengthOf.at.most(10)
          pm.expect(items).to.have.lengthOf.at.most(4)
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
        pm.test("Empty array", () => {
          const empty = pm.response.json().emptyArray
          pm.expect(empty).to.have.length.at.least(0)
          pm.expect(empty).to.have.length.at.most(0)
          pm.expect(empty).to.have.length(0)
          pm.expect(empty).to.have.lengthOf(0)
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
        pm.test("String length", () => {
          const str = "hello world"
          pm.expect(str).to.have.length.at.least(5)
          pm.expect(str).to.have.length.at.most(20)
          pm.expect(str).to.have.length(11)
          pm.expect(str).to.have.lengthOf(11)
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
        pm.test("Nested array length", () => {
          const nested = pm.response.json().data.nested.values
          pm.expect(nested).to.have.length.at.least(5)
          pm.expect(nested).to.have.lengthOf(5)
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

describe("Hopp Namespace - Length Assertions", () => {
  const mockResponse: TestResponse = {
    status: 200,
    statusText: "OK",
    responseTime: 100,
    headers: [],
    body: {
      users: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
  }

  test("should support hopp namespace with .length.at.least()", async () => {
    const script = `
      hopp.test("Hopp length at least", () => {
        const data = hopp.response.body.asJSON()
        hopp.expect(data.users).to.have.length.at.least(1)
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
              descriptor: "Hopp length at least",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support hopp namespace with .length.at.most()", async () => {
    const script = `
      hopp.test("Hopp length at most", () => {
        const data = hopp.response.body.asJSON()
        hopp.expect(data.users).to.have.length.at.most(10)
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
              descriptor: "Hopp length at most",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support all length patterns in hopp namespace", async () => {
    const script = `
      hopp.test("All length patterns", () => {
        const data = hopp.response.body.asJSON()
        hopp.expect(data.users).to.have.length(3)
        hopp.expect(data.users).to.have.lengthOf(3)
        hopp.expect(data.users).to.have.length.above(2)
        hopp.expect(data.users).to.have.length.below(5)
        hopp.expect(data.users).to.have.length.within(1, 10)
        hopp.expect(data.users).to.have.length.gte(3)
        hopp.expect(data.users).to.have.length.lte(3)
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
              descriptor: "All length patterns",
              expectResults: [
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
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
})
