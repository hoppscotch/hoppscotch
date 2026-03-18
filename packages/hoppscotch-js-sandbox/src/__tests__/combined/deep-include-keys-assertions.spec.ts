import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)(
  "%s.expect() - deep.include() - Object Property Inclusion",
  (namespace) => {
    test("should pass when object deeply includes partial match", async () => {
      const testScript = `
      ${namespace}.test("deep.include() - object property inclusion", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3 }).to.deep.include({ a: 1, b: 2 });
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
      ${namespace}.test("deep.include() - negated", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2 }).to.not.deep.include({ a: 1, c: 3 });
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
      ${namespace}.test("deep.include() - nested objects", (namespace) => {
        const obj = { a: { b: { c: 1 } }, d: 2 };
        ${namespace}.expect(obj).to.deep.include({ a: { b: { c: 1 } } });
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
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - deep.include() - Array Object Inclusion",
  (namespace) => {
    test("should pass when array deeply includes object", async () => {
      const testScript = `
      ${namespace}.test("deep.include() - array object inclusion", (namespace) => {
        ${namespace}.expect([{ id: 1 }, { id: 2 }]).to.deep.include({ id: 1 });
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
      ${namespace}.test("deep.include() - array negated", (namespace) => {
        ${namespace}.expect([{ id: 1 }, { id: 2 }]).to.not.deep.include({ id: 3 });
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
      ${namespace}.test("deep.include() - complex array objects", (namespace) => {
        const arr = [
          { name: 'John', age: 30, address: { city: 'NYC' } },
          { name: 'Jane', age: 25, address: { city: 'LA' } }
        ];
        // deep.include on arrays requires exact object match
        ${namespace}.expect(arr).to.deep.include({ name: 'John', age: 30, address: { city: 'NYC' } });
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
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - include.deep() - Alternative Syntax",
  (namespace) => {
    test("should work with include.deep syntax", async () => {
      const testScript = `
      ${namespace}.test("include.deep() - alternative syntax", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3 }).to.include.deep({ a: 1, b: 2 });
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
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - include.keys() - Partial Key Matching",
  (namespace) => {
    test("should pass when object has at least the specified keys", async () => {
      const testScript = `
      ${namespace}.test("include.keys() - partial key matching", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3 }).to.include.keys('a', 'b');
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
      ${namespace}.test("include.keys() - with extra keys", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3, d: 4, e: 5 }).to.include.keys('a', 'b');
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
      ${namespace}.test("include.keys() - negated", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2 }).to.not.include.keys('c');
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
      ${namespace}.test("include.keys() - array syntax", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3 }).to.include.keys(['a', 'b']);
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
      ${namespace}.test("include.keys() - single key", (namespace) => {
        ${namespace}.expect({ a: 1, b: 2, c: 3 }).to.include.keys('a');
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
  }
)

describe.each(NAMESPACES)("%s.expect() - Combination Patterns", (namespace) => {
  test("should work with chained assertions", async () => {
    const testScript = `
      ${namespace}.test("chained deep.include", (namespace) => {
        const response = { status: 'success', data: { user: { id: 1, name: 'John' } } };
        ${namespace}.expect(response).to.be.an('object')
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
      ${namespace}.test("response validation with deep.include", (namespace) => {
        const jsonData = { status: 200, message: 'OK', data: { results: [] } };
        ${namespace}.expect(jsonData).to.deep.include({ status: 200, message: 'OK' });
        ${namespace}.expect(jsonData).to.include.keys('status', 'message', 'data');
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
