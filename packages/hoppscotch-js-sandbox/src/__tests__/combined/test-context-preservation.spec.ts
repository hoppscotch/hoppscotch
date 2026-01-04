/**
 * Regression Test: Test Context Preservation
 *
 * This test ensures that ALL expectation methods properly preserve the test context
 * and record assertions inside the correct test block, not at root level.
 *
 * Bug History:
 * - toBeType() and expectNotToBeType() were incorrectly using createExpectation() directly
 *   instead of createExpect(), which meant they didn't receive getCurrentTestContext
 * - This caused assertions to be recorded at root level instead of inside test blocks
 *
 * Related Issue: Test structure behavior change in JUnit reports
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe("Test Context Preservation - Regression Tests", () => {
  describe.each(NAMESPACES)(
    "%s namespace - toBeType() assertions",
    (namespace) => {
      test("toBeType() should record assertions INSIDE test block, not at root", () => {
        return expect(
          runTest(`
          ${namespace}.test("Type checking test", () => {
            ${namespace}.expect(42).toBeType('number')
            ${namespace}.expect('hello').toBeType('string')
            ${namespace}.expect(true).toBeType('boolean')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              // Root should have NO expectResults
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "Type checking test",
                  // All assertions should be INSIDE the test
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("negative toBeType() should record assertions INSIDE test block", () => {
        return expect(
          runTest(`
          ${namespace}.test("Negative type checking", () => {
            ${namespace}.expect(42).not.toBeType('string')
            ${namespace}.expect('hello').not.toBeType('number')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "Negative type checking",
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("mixed assertion types should all be in correct test context", () => {
        return expect(
          runTest(`
          ${namespace}.test("Mixed assertions", () => {
            ${namespace}.expect(1).toBe(1)
            ${namespace}.expect(42).toBeType('number')
            ${namespace}.expect('test').toBe('test')
            ${namespace}.expect('hello').toBeType('string')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "Mixed assertions",
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("multiple tests should each have their own assertions", () => {
        return expect(
          runTest(`
          ${namespace}.test("First test", () => {
            ${namespace}.expect(1).toBeType('number')
          })

          ${namespace}.test("Second test", () => {
            ${namespace}.expect('test').toBeType('string')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "First test",
                  expectResults: [expect.objectContaining({ status: "pass" })],
                }),
                expect.objectContaining({
                  descriptor: "Second test",
                  expectResults: [expect.objectContaining({ status: "pass" })],
                }),
              ]),
            }),
          ])
        )
      })

      test("async tests should preserve context for toBeType", () => {
        return expect(
          runTest(`
          ${namespace}.test("Async type checking", async () => {
            const value = await Promise.resolve(42)
            ${namespace}.expect(value).toBeType('number')

            const str = await Promise.resolve('hello')
            ${namespace}.expect(str).toBeType('string')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "Async type checking",
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("all expectation methods should preserve context", () => {
        return expect(
          runTest(`
          ${namespace}.test("All expectation methods", () => {
            ${namespace}.expect(1).toBe(1)
            ${namespace}.expect(200).toBeLevel2xx()
            ${namespace}.expect(300).toBeLevel3xx()
            ${namespace}.expect(400).toBeLevel4xx()
            ${namespace}.expect(500).toBeLevel5xx()
            ${namespace}.expect(42).toBeType('number')
            ${namespace}.expect([1, 2, 3]).toHaveLength(3)
            ${namespace}.expect('hello world').toInclude('hello')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "All expectation methods",
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("negated expectations should preserve context", () => {
        return expect(
          runTest(`
          ${namespace}.test("Negated expectations", () => {
            ${namespace}.expect(1).not.toBe(2)
            ${namespace}.expect(400).not.toBeLevel2xx()
            ${namespace}.expect(42).not.toBeType('string')
            ${namespace}.expect([1, 2]).not.toHaveLength(5)
            ${namespace}.expect('hello').not.toInclude('goodbye')
          })
        `)()
        ).resolves.toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              descriptor: "root",
              expectResults: [],
              children: expect.arrayContaining([
                expect.objectContaining({
                  descriptor: "Negated expectations",
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  describe("Root level should never have expectResults", () => {
    test("empty root expectResults for pm namespace", () => {
      return expect(
        runTest(`
          pm.test("Test 1", () => {
            pm.expect(1).toBe(1)
            pm.expect(2).toBeType('number')
          })

          pm.test("Test 2", () => {
            pm.expect('test').toBe('test')
            pm.expect('str').toBeType('string')
          })
        `)()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            // Root must have empty expectResults.
            expectResults: [],
            children: expect.any(Array),
          }),
        ])
      )
    })

    test("empty root expectResults for hopp namespace", () => {
      return expect(
        runTest(`
          hopp.test("Test 1", () => {
            hopp.expect(1).toBe(1)
            hopp.expect(2).toBeType('number')
          })

          hopp.test("Test 2", () => {
            hopp.expect('test').toBe('test')
            hopp.expect('str').toBeType('string')
          })
        `)()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            expectResults: [],
            children: expect.any(Array),
          }),
        ])
      )
    })
  })
})
