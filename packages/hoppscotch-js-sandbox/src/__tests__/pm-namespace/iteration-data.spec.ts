import { describe, expect, test } from "vitest"
import { runPreRequest, runTest } from "~/utils/test-helpers"

/**
 * pm.iterationData tests (PM002)
 *
 * pm.iterationData reads exclusively from the "__hopp_row__" sentinel key injected
 * by the runner into the selected env scope as a JSON-serialised dataset row.
 *
 *   - get(key)    → reads key from JSON.parse(__hopp_row__); returns undefined if absent
 *   - has(key)    → checks own-property existence on JSON.parse(__hopp_row__)
 *   - toObject()  → JSON.parse(__hopp_row__) or {}
 *   - toJSON()    → same as toObject()
 *
 * None of these methods fall through to other variable scopes (environment, global).
 */

// ---------------------------------------------------------------------------
// Test script (post-request)
// ---------------------------------------------------------------------------

describe("pm.iterationData — test script (post-request)", () => {
  // --- get() ----------------------------------------------------------------

  test("get() returns a string value from the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ userId: "42" }))
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

  test("get() preserves numeric type from the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ count: 7 }))
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

  test("get() preserves boolean type from the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ active: true }))
          const val = pm.iterationData.get("active")
          pw.expect(val).toBe(true)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'true' to be 'true'" }],
      }),
    ])
  })

  test("get() returns undefined for a key not in the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ other: "x" }))
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

  test("get() returns undefined when no dataset row has been injected", () => {
    return expect(
      runTest(
        `
          const val = pm.iterationData.get("any_key")
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

  test("has() returns true when the key is in the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ iter_flag: "yes" }))
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

  test("has() returns false for a key not in the dataset row", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ other: "x" }))
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

  test("has() returns false when no dataset row has been injected", () => {
    return expect(
      runTest(
        `
          pw.expect(pm.iterationData.has("any")).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
      }),
    ])
  })

  test("has() does NOT leak into environment scope — key in env but not in dataset returns false", () => {
    return expect(
      runTest(
        `
          // Key exists in env, but NOT in the __hopp_row__ dataset sentinel
          pm.environment.set("env_only_key", "present")
          pm.environment.set("__hopp_row__", JSON.stringify({ other: "x" }))
          pw.expect(pm.iterationData.has("env_only_key")).toBe(false)
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

  test("toObject() returns the parsed dataset row when runner has pre-loaded __hopp_row__", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ name: "Alice", age: 30 }))
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

  test("toObject() returns an empty object when no dataset row has been injected", () => {
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
          pm.environment.set("__hopp_row__", JSON.stringify({ city: "Paris", code: "FR" }))
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

  test("toJSON() returns an empty object when no dataset row has been injected", () => {
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

  // --- scope isolation -------------------------------------------------------

  test("get() does NOT leak into environment scope — env-only key returns undefined", () => {
    return expect(
      runTest(
        `
          pm.environment.set("env_only", "env_val")
          pm.environment.set("__hopp_row__", JSON.stringify({ dataset_key: "dataset_val" }))
          // env_only exists in env but is NOT in the dataset row
          pw.expect(pm.iterationData.get("env_only")).toBe(undefined)
          // dataset_key is in the dataset row
          pw.expect(pm.iterationData.get("dataset_key")).toBe("dataset_val")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'dataset_val' to be 'dataset_val'" },
        ],
      }),
    ])
  })
})

// ---------------------------------------------------------------------------
// Pre-request script
// ---------------------------------------------------------------------------

describe("pm.iterationData — pre-request script", () => {
  test("get() returns typed value from dataset row in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ iter_pre: "pre_val", count: 5 }))
          const val = pm.iterationData.get("iter_pre")
          if (val !== "pre_val") throw new Error("Expected pre_val, got " + val)
          const num = pm.iterationData.get("count")
          if (num !== 5) throw new Error("Expected 5, got " + num)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("get() returns undefined for key not in dataset in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ other: "x" }))
          const val = pm.iterationData.get("missing_key")
          if (val !== undefined) throw new Error("Expected undefined, got " + val)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("has() works in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ iter_pre_has: "exists" }))
          if (!pm.iterationData.has("iter_pre_has")) throw new Error("has() returned false for existing key")
          if (pm.iterationData.has("iter_pre_missing")) throw new Error("has() returned true for missing key")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toObject() works in pre-request when __hopp_row__ is set", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ a: 1, b: 2 }))
          const obj = pm.iterationData.toObject()
          if (obj.a !== 1) throw new Error("Expected obj.a=1, got " + obj.a)
          if (obj.b !== 2) throw new Error("Expected obj.b=2, got " + obj.b)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toJSON() works in pre-request when __hopp_row__ is set", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ x: "hello" }))
          const obj = pm.iterationData.toJSON()
          if (obj.x !== "hello") throw new Error("Expected obj.x='hello', got " + obj.x)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toObject() returns an empty object in pre-request when no dataset row is set", () => {
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

