import { describe, expect, test } from "vitest"
import { runPreRequest, runTest } from "~/utils/test-helpers"

/**
 * pm.iterationData tests (PM002)
 *
 * pm.iterationData is implemented as a read-only delegation layer over pm.variables /
 * pm.environment (active scope).
 *
 * Migration strategy (Group 2):
 *   - get(key)    → pm.variables.get(key)
 *   - has(key)    → pm.variables.has(key)
 *   - toObject()  → JSON.parse(pm.environment.get("row")) or {}
 *   - toJSON()    → same as toObject()
 *
 * The runner is responsible for injecting dataset row keys into the active environment
 * before the request runs, and optionally serialising the whole row under the "row" key.
 */

// ---------------------------------------------------------------------------
// Test script (post-request)
// ---------------------------------------------------------------------------

describe("pm.iterationData — test script (post-request)", () => {
  // --- get() ----------------------------------------------------------------

  test("get() returns a value that was injected into the active environment", () => {
    return expect(
      runTest(
        `
          // Simulate runner injecting dataset row into the environment
          pm.environment.set("userId", "42")
          const val = pm.iterationData.get("userId")
          pw.expect(val).toBe("42")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '42' to be '42'" }],
      }),
    ])
  })

  test("get() returns a numeric value correctly", () => {
    return expect(
      runTest(
        `
          pm.environment.set("count", 7)
          const val = pm.iterationData.get("count")
          pw.expect(val).toBe(7)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '7' to be '7'" }],
      }),
    ])
  })

  test("get() returns undefined for a key that was never injected", () => {
    return expect(
      runTest(
        `
          const val = pm.iterationData.get("nonexistent_iter_key")
          pw.expect(val).toBe(undefined)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'undefined' to be 'undefined'" }],
      }),
    ])
  })

  // --- has() ----------------------------------------------------------------

  test("has() returns true when the key is in the active environment", () => {
    return expect(
      runTest(
        `
          pm.environment.set("iter_flag", "yes")
          pw.expect(pm.iterationData.has("iter_flag")).toBe(true)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'true' to be 'true'" }],
      }),
    ])
  })

  test("has() returns false for a key that was never injected", () => {
    return expect(
      runTest(
        `
          pw.expect(pm.iterationData.has("iter_missing")).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
      }),
    ])
  })

  // --- toObject() -----------------------------------------------------------

  test("toObject() returns the parsed 'row' env variable when the runner has pre-loaded it", () => {
    return expect(
      runTest(
        `
          // Simulate runner pre-loading the full dataset row as serialised JSON
          pm.environment.set("row", JSON.stringify({ name: "Alice", age: 30 }))
          const obj = pm.iterationData.toObject()
          pw.expect(obj.name).toBe("Alice")
          pw.expect(obj.age).toBe(30)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'Alice' to be 'Alice'" },
          { status: "pass", message: "Expected '30' to be '30'" },
        ],
      }),
    ])
  })

  test("toObject() returns an empty object when no 'row' variable has been set", () => {
    return expect(
      runTest(
        `
          const obj = pm.iterationData.toObject()
          pw.expect(typeof obj).toBe("object")
          pw.expect(Object.keys(obj).length).toBe(0)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'object' to be 'object'" },
          { status: "pass", message: "Expected '0' to be '0'" },
        ],
      }),
    ])
  })

  // --- toJSON() -------------------------------------------------------------

  test("toJSON() returns the same result as toObject()", () => {
    return expect(
      runTest(
        `
          pm.environment.set("row", JSON.stringify({ city: "Paris", code: "FR" }))
          const fromToObject = pm.iterationData.toObject()
          const fromToJSON   = pm.iterationData.toJSON()
          pw.expect(fromToJSON.city).toBe(fromToObject.city)
          pw.expect(fromToJSON.code).toBe(fromToObject.code)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'Paris' to be 'Paris'" },
          { status: "pass", message: "Expected 'FR' to be 'FR'" },
        ],
      }),
    ])
  })

  test("toJSON() returns an empty object when no 'row' variable has been set", () => {
    return expect(
      runTest(
        `
          const obj = pm.iterationData.toJSON()
          pw.expect(typeof obj).toBe("object")
          pw.expect(Object.keys(obj).length).toBe(0)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'object' to be 'object'" },
          { status: "pass", message: "Expected '0' to be '0'" },
        ],
      }),
    ])
  })

  // --- cross-namespace consistency -----------------------------------------

  test("value injected via pm.environment is readable via pm.iterationData.get()", () => {
    return expect(
      runTest(
        `
          pm.environment.set("shared", "shared_val")
          pw.expect(pm.iterationData.get("shared")).toBe("shared_val")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'shared_val' to be 'shared_val'" },
        ],
      }),
    ])
  })
})

// ---------------------------------------------------------------------------
// Pre-request script
// ---------------------------------------------------------------------------

describe("pm.iterationData — pre-request script", () => {
  test("get() works in pre-request when key is in active env", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("iter_pre", "pre_val")
          const val = pm.iterationData.get("iter_pre")
          if (val !== "pre_val") throw new Error("Expected pre_val, got " + val)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("has() works in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("iter_pre_has", "exists")
          if (!pm.iterationData.has("iter_pre_has")) throw new Error("has() returned false for existing key")
          if (pm.iterationData.has("iter_pre_missing")) throw new Error("has() returned true for missing key")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toObject() works in pre-request when 'row' env is set", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("row", JSON.stringify({ a: 1, b: 2 }))
          const obj = pm.iterationData.toObject()
          if (obj.a !== 1) throw new Error("Expected obj.a=1, got " + obj.a)
          if (obj.b !== 2) throw new Error("Expected obj.b=2, got " + obj.b)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toJSON() works in pre-request when 'row' env is set", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("row", JSON.stringify({ x: "hello" }))
          const obj = pm.iterationData.toJSON()
          if (obj.x !== "hello") throw new Error("Expected obj.x='hello', got " + obj.x)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toObject() returns an empty object in pre-request when 'row' is not set", () => {
    return expect(
      runPreRequest(
        `
          const obj = pm.iterationData.toObject()
          if (typeof obj !== "object") throw new Error("Expected object, got " + typeof obj)
          if (Object.keys(obj).length !== 0) throw new Error("Expected empty object, got " + JSON.stringify(obj))
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })
})

