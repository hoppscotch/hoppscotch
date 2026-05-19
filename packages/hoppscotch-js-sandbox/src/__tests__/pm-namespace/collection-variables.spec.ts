import { describe, expect, test } from "vitest"
import { runPreRequest, runTest } from "~/utils/test-helpers"

/**
 * pm.collectionVariables tests
 *
 * pm.collectionVariables is implemented as a thin delegation layer over pm.environment
 * (active scope). All reads/writes target the same hopp.env.active store, so data
 * set via collectionVariables is immediately visible via pm.environment and vice-versa.
 */
describe("pm.collectionVariables — test script (post-request)", () => {
  test("set() and get() round-trip a string value", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_key", "hello")
          const val = pm.collectionVariables.get("cv_key")
          pw.expect(val).toBe("hello")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'hello' to be 'hello'" }],
      }),
    ])
  })

  test("set() and get() round-trip a numeric value", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_num", 42)
          const val = pm.collectionVariables.get("cv_num")
          pw.expect(val).toBe(42)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '42' to be '42'" }],
      }),
    ])
  })

  test("get() returns undefined for missing keys", () => {
    return expect(
      runTest(
        `
          const val = pm.collectionVariables.get("nonexistent_cv")
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

  test("has() returns true after set()", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_exists", "yes")
          pw.expect(pm.collectionVariables.has("cv_exists")).toBe(true)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'true' to be 'true'" }],
      }),
    ])
  })

  test("has() returns false for missing keys", () => {
    return expect(
      runTest(
        `
          pw.expect(pm.collectionVariables.has("cv_missing")).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
      }),
    ])
  })

  test("unset() removes a previously set key", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_del", "bye")
          pw.expect(pm.collectionVariables.has("cv_del")).toBe(true)
          pm.collectionVariables.unset("cv_del")
          pw.expect(pm.collectionVariables.has("cv_del")).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'true' to be 'true'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
        ],
      }),
    ])
  })

  test("toObject() returns set variables as a plain object", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_a", "alpha")
          pm.collectionVariables.set("cv_b", "beta")
          const obj = pm.collectionVariables.toObject()
          pw.expect(obj.cv_a).toBe("alpha")
          pw.expect(obj.cv_b).toBe("beta")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'alpha' to be 'alpha'" },
          { status: "pass", message: "Expected 'beta' to be 'beta'" },
        ],
      }),
    ])
  })

  test("replaceIn() substitutes {{varName}} placeholders", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_host", "api.example.com")
          const result = pm.collectionVariables.replaceIn("https://{{cv_host}}/v1")
          pw.expect(result).toBe("https://api.example.com/v1")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'https://api.example.com/v1' to be 'https://api.example.com/v1'" },
        ],
      }),
    ])
  })

  test("replaceIn() leaves unresolvable placeholders unchanged", () => {
    return expect(
      runTest(
        `
          const result = pm.collectionVariables.replaceIn("Hello {{cv_unknown}}")
          pw.expect(result).toBe("Hello {{cv_unknown}}")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'Hello {{cv_unknown}}' to be 'Hello {{cv_unknown}}'" },
        ],
      }),
    ])
  })

  test("clear() is a no-op in Hoppscotch (collection and environment share the same scope)", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("cv_x", "x")
          pm.collectionVariables.set("cv_y", "y")
          pw.expect(pm.collectionVariables.has("cv_x")).toBe(true)
          // clear() is intentionally a no-op: collectionVariables shares the active
          // environment scope, so clearing would destructively wipe environment variables.
          pm.collectionVariables.clear()
          // Variables must still be present — clear() does not remove them.
          pw.expect(pm.collectionVariables.has("cv_x")).toBe(true)
          pw.expect(pm.collectionVariables.has("cv_y")).toBe(true)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'true' to be 'true'" },
          { status: "pass", message: "Expected 'true' to be 'true'" },
          { status: "pass", message: "Expected 'true' to be 'true'" },
        ],
      }),
    ])
  })

  test("data written via collectionVariables is readable via pm.environment (shared store)", () => {
    return expect(
      runTest(
        `
          pm.collectionVariables.set("shared_key", "shared_val")
          const fromEnv = pm.environment.get("shared_key")
          pw.expect(fromEnv).toBe("shared_val")
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

  test("data written via pm.environment is readable via collectionVariables (shared store)", () => {
    return expect(
      runTest(
        `
          pm.environment.set("env_key", "env_val")
          const fromCV = pm.collectionVariables.get("env_key")
          pw.expect(fromCV).toBe("env_val")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'env_val' to be 'env_val'" },
        ],
      }),
    ])
  })
})

describe("pm.collectionVariables — pre-request script", () => {
  test("set() and get() round-trip in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.collectionVariables.set("cv_pre", "pre_val")
          const val = pm.collectionVariables.get("cv_pre")
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
          pm.collectionVariables.set("cv_pre_has", "exists")
          if (!pm.collectionVariables.has("cv_pre_has")) throw new Error("has() returned false")
          if (pm.collectionVariables.has("cv_pre_missing")) throw new Error("has() returned true for missing key")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("unset() works in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.collectionVariables.set("cv_pre_del", "to_delete")
          pm.collectionVariables.unset("cv_pre_del")
          if (pm.collectionVariables.has("cv_pre_del")) throw new Error("unset() did not remove key")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("toObject() works in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.collectionVariables.set("cv_pre_obj", "obj_val")
          const obj = pm.collectionVariables.toObject()
          if (obj.cv_pre_obj !== "obj_val") throw new Error("toObject() returned wrong value: " + JSON.stringify(obj))
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("replaceIn() works in pre-request", () => {
    return expect(
      runPreRequest(
        `
          pm.collectionVariables.set("cv_pre_tpl", "replaced")
          const result = pm.collectionVariables.replaceIn("Value: {{cv_pre_tpl}}")
          if (result !== "Value: replaced") throw new Error("replaceIn() returned: " + result)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("clear() is a no-op in pre-request (variables still present after call)", () => {
    return expect(
      runPreRequest(
        `
          pm.collectionVariables.set("cv_pre_clr", "clear_me")
          // clear() is intentionally a no-op — must not throw and must not remove keys.
          pm.collectionVariables.clear()
          if (!pm.collectionVariables.has("cv_pre_clr")) throw new Error("clear() unexpectedly removed a key")
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })
})

