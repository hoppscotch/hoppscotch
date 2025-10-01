/**
 * PM Namespace - Advanced Chai Features Test Suite
 *
 * Tests for advanced Chai features including:
 * - .nested property assertions
 * - .by() chaining for change/increase/decrease
 */

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

  describe(".by() chaining for side effects", () => {
    test(".change().by() validates exact delta", () => {
      return expect(
        runTest(
          `
            pm.test("Change by exact amount", function() {
              const obj = { value: 10 }
              pm.expect(() => { obj.value = 15 }).to.change(obj, "value").by(5)
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Change by exact amount",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test(".increase().by() validates exact increase", () => {
      return expect(
        runTest(
          `
            pm.test("Increase by exact amount", function() {
              const obj = { count: 5 }
              pm.expect(() => { obj.count += 3 }).to.increase(obj, "count").by(3)
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Increase by exact amount",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test(".decrease().by() validates exact decrease", () => {
      return expect(
        runTest(
          `
            pm.test("Decrease by exact amount", function() {
              const obj = { score: 100 }
              pm.expect(() => { obj.score -= 25 }).to.decrease(obj, "score").by(25)
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Decrease by exact amount",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test(".change().by() with negative delta", () => {
      return expect(
        runTest(
          `
            pm.test("Change by negative amount", function() {
              const obj = { value: 50 }
              pm.expect(() => { obj.value = 30 }).to.change(obj, "value").by(-20)
            })
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Change by negative amount",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })
})
