import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pm.expect - Advanced Chai Features", () => {
  describe(".nested property assertions", () => {
    test("should access nested properties using dot notation", () => {
      return expect(
        runTest(
          `
            pm.test("Nested property access", function() {
              const obj = { a: { b: { c: "value" } } }
              pm.expect(obj).to.have.nested.property("a.b.c", "value")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Nested property access",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should access nested properties without value check", () => {
      return expect(
        runTest(
          `
            pm.test("Nested property existence", function() {
              const obj = { x: { y: { z: 123 } } }
              pm.expect(obj).to.have.nested.property("x.y.z")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Nested property existence",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should handle nested array indices", () => {
      return expect(
        runTest(
          `
            pm.test("Nested array access", function() {
              const obj = { items: [{ name: "first" }, { name: "second" }] }
              pm.expect(obj).to.have.nested.property("items[1].name", "second")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Nested array access",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should work with .not negation", () => {
      return expect(
        runTest(
          `
            pm.test("Negated nested property", function() {
              const obj = { a: { b: "value" } }
              pm.expect(obj).to.not.have.nested.property("a.c")
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Negated nested property",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })

  // Side-effect assertions with .by() chaining are comprehensively tested in
  // change-increase-decrease-getter.spec.ts which includes both getter and object+property patterns,
  // positive/negative deltas, and all assertion combinations
})
