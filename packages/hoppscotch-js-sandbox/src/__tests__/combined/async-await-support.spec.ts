/**
 * Async/Await Support Tests
 *
 * Tests that pm.test() and hopp.test() properly support async functions with await,
 * which is critical for Postman script imports that use asynchronous patterns.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)("%s.test() - Async/Await Support", (namespace) => {
  test("should support async function with await", () => {
    return expect(
      runTest(`
          ${namespace}.test("async with await", async function() {
            const promise = new Promise((resolve) => {
              resolve(42)
            })
            const result = await promise
            ${namespace}.expect(result).to.equal(42)
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })

  test("should support async arrow function", () => {
    return expect(
      runTest(`
          ${namespace}.test("async arrow", async () => {
            const result = await Promise.resolve("success")
            ${namespace}.expect(result).to.equal("success")
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })

  test("should support Promise.all with await", () => {
    return expect(
      runTest(`
          ${namespace}.test("Promise.all", async function() {
            const results = await Promise.all([
              Promise.resolve(1),
              Promise.resolve(2),
              Promise.resolve(3)
            ])
            ${namespace}.expect(results).to.eql([1, 2, 3])
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })

  test("should support async error handling", () => {
    return expect(
      runTest(`
          ${namespace}.test("async error", async function() {
            try {
              await Promise.reject(new Error("test error"))
              ${namespace}.expect.fail("Should not reach here")
            } catch (error) {
              ${namespace}.expect(error.message).to.equal("test error")
            }
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })

  test("should support multiple sequential awaits", () => {
    return expect(
      runTest(`
          ${namespace}.test("sequential awaits", async function() {
            const a = await Promise.resolve(10)
            const b = await Promise.resolve(20)
            const c = await Promise.resolve(30)
            ${namespace}.expect(a + b + c).to.equal(60)
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })

  test("should support async IIFE pattern", () => {
    return expect(
      runTest(`
          ${namespace}.test("async IIFE", async function() {
            const result = await (async () => {
              const data = await Promise.resolve({ value: 100 })
              return data.value * 2
            })()
            ${namespace}.expect(result).to.equal(200)
          })
        `)()
    ).resolves.toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          expectResults: expect.arrayContaining([
            expect.objectContaining({ status: "pass" }),
          ]),
        }),
      ])
    )
  })
})
