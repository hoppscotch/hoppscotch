// .property('key') returns a NEW expectation wrapping the property value

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("property() with .that chaining", () => {
  test("should chain property value with .that.equals()", async () => {
    const testScript = `
      pm.test("property chaining with that", () => {
        pm.expect({ a: 1, b: 2 }).to.have.property('a').that.equals(1);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "property chaining with that",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should chain nested property with .that.is.an()", async () => {
    const testScript = `
      pm.test("nested property chaining", () => {
        pm.expect({ nested: { value: 42 } })
          .to.have.property('nested')
          .that.is.an('object');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "nested property chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .which as alias for .that", async () => {
    const testScript = `
      pm.test("property chaining with which", () => {
        pm.expect({ x: 1 }).to.have.property('x').which.equals(1);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "property chaining with which",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support complex chaining", async () => {
    const testScript = `
      pm.test("complex property chaining", () => {
        pm.expect({ name: 'John', age: 30 })
          .to.be.an('object')
          .and.have.property('name')
          .that.is.a('string')
          .and.equals('John');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "complex property chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should fail when chained value doesn't match", async () => {
    const testScript = `
      pm.test("property chaining fails correctly", () => {
        pm.expect({ a: 1, b: 2 }).to.have.property('a').that.equals(2);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "property chaining fails correctly",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "fail" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("property() with value parameter", () => {
  test("should assert property value directly", async () => {
    const testScript = `
      pm.test("property with value", () => {
        pm.expect({ a: 1, b: 2 }).to.have.property('a', 1);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "property with value",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should fail when property value doesn't match", async () => {
    const testScript = `
      pm.test("property value mismatch", () => {
        pm.expect({ a: 1, b: 2 }).to.not.have.property('a', 2);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "property value mismatch",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("own.property() assertions", () => {
  test("should check own properties vs inherited", async () => {
    const testScript = `
      pm.test("own property check", () => {
        const obj = Object.create({ inherited: true });
        obj.own = true;
        pm.expect(obj).to.have.own.property('own');
        pm.expect(obj).to.not.have.own.property('inherited');
        pm.expect(obj).to.have.property('inherited');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "own property check",
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
