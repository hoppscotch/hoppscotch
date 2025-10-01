/**
 * PM Namespace - Language Chain `.and` Tests
 *
 * Tests for .and language chain that allows chaining multiple assertions.
 * This is failing in collection with "TypeError: cannot read property 'and' of undefined"
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe(".and chain - multiple assertions", () => {
  test("should chain type assertion with include", async () => {
    const testScript = `
      pm.test("and chain - type and include", () => {
        pm.expect('hello world').to.be.a('string').and.include('world');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "and chain - type and include",
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

  test("should chain type assertion with lengthOf", async () => {
    const testScript = `
      pm.test("and chain - type and length", () => {
        pm.expect([1, 2, 3]).to.be.an('array').and.have.lengthOf(3);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "and chain - type and length",
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

  test("should support complex chaining with multiple .and", async () => {
    const testScript = `
      pm.test("complex and chaining", () => {
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
              descriptor: "complex and chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should work with .and.not for negation", async () => {
    const testScript = `
      pm.test("and with negation", () => {
        pm.expect({ a: 1, b: 2 })
          .to.be.an('object')
          .and.not.be.empty
          .and.not.have.property('c');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "and with negation",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should chain numeric comparisons", async () => {
    const testScript = `
      pm.test("and with numbers", () => {
        pm.expect(200)
          .to.be.a('number')
          .and.be.within(200, 299)
          .and.equal(200);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "and with numbers",
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
