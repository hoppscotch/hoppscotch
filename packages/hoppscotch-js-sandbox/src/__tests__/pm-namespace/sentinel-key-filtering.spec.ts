/**
 * @file Sentinel key filtering tests
 *
 * Sentinel keys injected by the runner (__hopp_row__, __hopp_iteration_count__)
 * must NEVER be exposed through user-facing pm.* APIs:
 *   - pm.environment.toObject()      must NOT contain sentinel keys
 *   - pm.variables.toObject()        must NOT contain sentinel keys
 *   - pm.collectionVariables.has()   must return false for sentinel keys
 *   - pm.variables.get()             reads raw typed values (getRaw, no interpolation)
 *
 * These tests cover both the test-script (post-request) and pre-request contexts.
 */

import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

// ─── Sentinel keys ────────────────────────────────────────────────────────────

const SENTINELS = ["__hopp_row__", "__hopp_iteration_count__", "__hopp_current_iteration__"]

// ─── Post-request (test script) ───────────────────────────────────────────────

describe("Sentinel key filtering — test script (post-request)", () => {
  for (const sentinel of SENTINELS) {
    test(`pm.environment.toObject() does NOT expose "${sentinel}"`, () => {
      return expect(
        runTest(
          `
            pm.environment.set("${sentinel}", "should-not-appear")
            const obj = pm.environment.toObject()
            pw.expect("${sentinel}" in obj).toBe(false)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
        }),
      ])
    })

    test(`pm.variables.toObject() does NOT expose "${sentinel}"`, () => {
      return expect(
        runTest(
          `
            pm.environment.set("${sentinel}", "should-not-appear")
            const obj = pm.variables.toObject()
            pw.expect("${sentinel}" in obj).toBe(false)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
        }),
      ])
    })

    test(`pm.collectionVariables.has("${sentinel}") returns false`, () => {
      return expect(
        runTest(
          `
            pm.environment.set("${sentinel}", "injected-by-runner")
            pw.expect(pm.collectionVariables.has("${sentinel}")).toBe(false)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [{ status: "pass", message: "Expected 'false' to be 'false'" }],
        }),
      ])
    })
  }

  test("pm.environment.toObject() includes normal user variables when sentinels are present", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ col: "val" }))
          pm.environment.set("user_var", "visible")
          const obj = pm.environment.toObject()
          pw.expect(obj.user_var).toBe("visible")
          pw.expect("__hopp_row__" in obj).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'visible' to be 'visible'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
        ],
      }),
    ])
  })

  test("pm.variables.toObject() includes normal user variables when sentinels are present", () => {
    return expect(
      runTest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ col: "val" }))
          pm.variables.set("user_var2", "also-visible")
          const obj = pm.variables.toObject()
          pw.expect(obj.user_var2).toBe("also-visible")
          pw.expect("__hopp_row__" in obj).toBe(false)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'also-visible' to be 'also-visible'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
        ],
      }),
    ])
  })
})

// ─── Pre-request script ───────────────────────────────────────────────────────

describe("Sentinel key filtering — pre-request script", () => {
  for (const sentinel of SENTINELS) {
    test(`pm.environment.toObject() does NOT expose "${sentinel}" in pre-request`, () => {
      return expect(
        runPreRequest(
          `
            pm.environment.set("${sentinel}", "should-not-appear")
            const obj = pm.environment.toObject()
            if ("${sentinel}" in obj) throw new Error("Sentinel leaked into toObject(): " + JSON.stringify(obj))
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toBeRight()
    })

    test(`pm.variables.toObject() does NOT expose "${sentinel}" in pre-request`, () => {
      return expect(
        runPreRequest(
          `
            pm.environment.set("${sentinel}", "should-not-appear")
            const obj = pm.variables.toObject()
            if ("${sentinel}" in obj) throw new Error("Sentinel leaked into pm.variables.toObject(): " + JSON.stringify(obj))
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toBeRight()
    })

    test(`pm.collectionVariables.has("${sentinel}") returns false in pre-request`, () => {
      return expect(
        runPreRequest(
          `
            pm.environment.set("${sentinel}", "injected")
            if (pm.collectionVariables.has("${sentinel}")) throw new Error("collectionVariables.has() leaked sentinel key")
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toBeRight()
    })
  }
})

// ─── pm.variables.get() raw-value preservation (no {{...}} interpolation) ────

describe("pm.variables.get() raw-value preservation — pre-request script", () => {
  test("returns the raw uninterpolated value when dataset col contains {{placeholders}}", () => {
    /**
     * If pm.variables.get() used envGetResolve (the resolving path), a dataset column
     * value like "{{host}}/path" would be template-expanded to e.g. "api.example.com/path".
     * getRaw() must be used instead so the literal string is returned unchanged.
     */
    return expect(
      runPreRequest(
        `
          pm.environment.set("host", "api.example.com")
          // Simulate a dataset column whose value looks like a template literal
          pm.environment.set("dataset_col", "{{host}}/path")
          // pm.variables.get() should return the RAW string — NOT resolve {{host}}
          const val = pm.variables.get("dataset_col")
          if (val !== "{{host}}/path") throw new Error("Expected raw '{{host}}/path', got: " + val)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("pm.variables.get() returns a number typed value (not string) for a numeric env entry", () => {
    return expect(
      runPreRequest(
        `
          pm.environment.set("__hopp_row__", JSON.stringify({ count: 7 }))
          const val = pm.iterationData.get("count")
          if (typeof val !== "number") throw new Error("Expected number, got " + typeof val + ": " + val)
          if (val !== 7) throw new Error("Expected 7, got: " + val)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })

  test("pm.variables.get() returns undefined (not null or string) for missing keys — pre-request", () => {
    return expect(
      runPreRequest(
        `
          const val = pm.variables.get("definitely_not_set_key_xyz")
          if (val !== undefined) throw new Error("Expected undefined, got: " + val)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeRight()
  })
})

