import { describe, expect, test } from "vitest"
import { isInfraError } from "~/utils/cage"

describe("isInfraError", () => {
  test("identifies Error instances as infrastructure errors", () => {
    expect(isInfraError(new Error("test error"))).toBe(true)
  })

  test("identifies Error subclasses as infrastructure errors", () => {
    class QuickJSUnwrapError extends Error {
      constructor(message: string) {
        super(message)
        this.name = "QuickJSUnwrapError"
      }
    }

    expect(
      isInfraError(new QuickJSUnwrapError("cannot convert to object"))
    ).toBe(true)
  })

  test("identifies WASM initialization errors", () => {
    expect(isInfraError(new Error("wasm init failed"))).toBe(true)
  })

  test("does not classify plain objects from QuickJS dump() as infrastructure", () => {
    // QuickJS dump() produces plain objects for user script errors — NOT Error instances
    expect(
      isInfraError({
        name: "ReferenceError",
        message: "a is not defined",
        stack: "    at <anonymous> (eval.js:1)\n",
      })
    ).toBe(false)

    expect(
      isInfraError({
        name: "TypeError",
        message: "cannot convert to object",
        stack: "    at keys (native)\n    at <anonymous> (eval.js:1)\n",
      })
    ).toBe(false)
  })

  test("handles non-object and null errors gracefully", () => {
    expect(isInfraError("string error")).toBe(false)
    expect(isInfraError(null)).toBe(false)
    expect(isInfraError(undefined)).toBe(false)
  })
})
