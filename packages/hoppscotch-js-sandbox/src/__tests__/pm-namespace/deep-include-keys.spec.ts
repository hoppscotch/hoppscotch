/**
 * PM Namespace - Deep Include and Include Keys Test Suite
 *
 * Tests for newly implemented Chai patterns:
 * - deep.include() for object/array deep inclusion matching
 * - include.keys() for partial key matching
 *
 * These patterns are commonly used in Postman collections and were
 * identified as missing during comprehensive collection testing.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("deep.include() - Object Property Inclusion", () => {
  test("should pass when object deeply includes partial match", async () => {
    const testScript = `
      pm.test("deep.include() - object property inclusion", () => {
        pm.expect({ a: 1, b: 2, c: 3 }).to.deep.include({ a: 1, b: 2 });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - object property inclusion",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when object does not include properties", async () => {
    const testScript = `
      pm.test("deep.include() - negated", () => {
        pm.expect({ a: 1, b: 2 }).to.not.deep.include({ a: 1, c: 3 });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - negated",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should work with nested objects", async () => {
    const testScript = `
      pm.test("deep.include() - nested objects", () => {
        const obj = { a: { b: { c: 1 } }, d: 2 };
        pm.expect(obj).to.deep.include({ a: { b: { c: 1 } } });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - nested objects",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("deep.include() - Array Object Inclusion", () => {
  test("should pass when array deeply includes object", async () => {
    const testScript = `
      pm.test("deep.include() - array object inclusion", () => {
        pm.expect([{ id: 1 }, { id: 2 }]).to.deep.include({ id: 1 });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - array object inclusion",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when array does not include object", async () => {
    const testScript = `
      pm.test("deep.include() - array negated", () => {
        pm.expect([{ id: 1 }, { id: 2 }]).to.not.deep.include({ id: 3 });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - array negated",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should work with exact nested objects in arrays", async () => {
    const testScript = `
      pm.test("deep.include() - complex array objects", () => {
        const arr = [
          { name: 'John', age: 30, address: { city: 'NYC' } },
          { name: 'Jane', age: 25, address: { city: 'LA' } }
        ];
        // deep.include on arrays requires exact object match
        pm.expect(arr).to.deep.include({ name: 'John', age: 30, address: { city: 'NYC' } });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.include() - complex array objects",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("include.deep() - Alternative Syntax", () => {
  test("should work with include.deep syntax", async () => {
    const testScript = `
      pm.test("include.deep() - alternative syntax", () => {
        pm.expect({ a: 1, b: 2, c: 3 }).to.include.deep({ a: 1, b: 2 });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.deep() - alternative syntax",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("include.keys() - Partial Key Matching", () => {
  test("should pass when object has at least the specified keys", async () => {
    const testScript = `
      pm.test("include.keys() - partial key matching", () => {
        pm.expect({ a: 1, b: 2, c: 3 }).to.include.keys('a', 'b');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.keys() - partial key matching",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass even when object has extra keys", async () => {
    const testScript = `
      pm.test("include.keys() - with extra keys", () => {
        pm.expect({ a: 1, b: 2, c: 3, d: 4, e: 5 }).to.include.keys('a', 'b');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.keys() - with extra keys",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when object does not have key", async () => {
    const testScript = `
      pm.test("include.keys() - negated", () => {
        pm.expect({ a: 1, b: 2 }).to.not.include.keys('c');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.keys() - negated",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should work with array of keys", async () => {
    const testScript = `
      pm.test("include.keys() - array syntax", () => {
        pm.expect({ a: 1, b: 2, c: 3 }).to.include.keys(['a', 'b']);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.keys() - array syntax",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should work with single key", async () => {
    const testScript = `
      pm.test("include.keys() - single key", () => {
        pm.expect({ a: 1, b: 2, c: 3 }).to.include.keys('a');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.keys() - single key",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Combination Patterns", () => {
  test("should work with chained assertions", async () => {
    const testScript = `
      pm.test("chained deep.include", () => {
        const response = { status: 'success', data: { user: { id: 1, name: 'John' } } };
        pm.expect(response).to.be.an('object')
          .and.deep.include({ status: 'success' });
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "chained deep.include",
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

  test("should work with response validation patterns", async () => {
    const testScript = `
      pm.test("response validation with deep.include", () => {
        const jsonData = { status: 200, message: 'OK', data: { results: [] } };
        pm.expect(jsonData).to.deep.include({ status: 200, message: 'OK' });
        pm.expect(jsonData).to.include.keys('status', 'message', 'data');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "response validation with deep.include",
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
