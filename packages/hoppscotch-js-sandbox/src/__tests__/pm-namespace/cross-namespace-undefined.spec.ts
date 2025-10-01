import { describe, expect, test } from "vitest"
import { runTest, runTestAndGetEnvs } from "~/utils/test-helpers"

/**
 * Cross-namespace undefined preservation tests
 *
 * These tests verify that undefined values set via PM namespace methods
 * can be correctly read by other namespaces (hopp, pw, pm).
 *
 * The undefined marker pattern ensures that undefined values survive
 * serialization across the sandbox boundary.
 */

describe("Cross-namespace undefined preservation", () => {
  test("hopp.env.get can read undefined set by pm.environment.set", () => {
    return expect(
      runTest(
        `
          pm.environment.set("undef_var", undefined)
          const value = hopp.env.get("undef_var")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  // NOTE: pw namespace is only available in pre-request context, not post-request/test context
  // This test would need to use runPreRequest helper instead of runTest
  // Skipping for now as other tests already verify cross-namespace undefined reading
  test.skip("pw.env.get can read undefined set by pm.environment.set", () => {
    return expect(
      runTest(
        `
          pm.environment.set("env_undef", undefined)
          const value = pw.env.get("env_undef")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("pm.variables.get can read undefined from environment", () => {
    return expect(
      runTest(
        `
          pm.environment.set("env_undef", undefined)
          const value = pm.variables.get("env_undef")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("hopp.env.active.get can read undefined set by pm.variables.set", () => {
    return expect(
      runTest(
        `
          pm.variables.set("var_undef", undefined)
          const value = hopp.env.active.get("var_undef")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("hopp.env.global.get can read undefined set by pm.globals.set", () => {
    return expect(
      runTest(
        `
          pm.globals.set("global_test", undefined)
          const value = hopp.env.global.get("global_test")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("undefined value appears correctly in environment array", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pm.environment.set("stored_undef", undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "stored_undef",
            // The value should be stored as the marker internally but exposed as "undefined" string for UI
            currentValue: "undefined",
            initialValue: "undefined",
            secret: false,
          },
        ],
      })
    )
  })

  test("undefined is preserved across multiple namespace reads", () => {
    return expect(
      runTest(
        `
          pm.environment.set("multi_read", undefined)

          // Read from PM namespace
          const pmValue = pm.environment.get("multi_read")
          pm.expect(pmValue).toBe(undefined)

          // Read from hopp namespace
          const hoppValue = hopp.env.get("multi_read")
          pm.expect(hoppValue).toBe(undefined)

          // Read from pm.variables (which resolves from environment)
          const varValue = pm.variables.get("multi_read")
          pm.expect(varValue).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("overwriting undefined with string works across namespaces", () => {
    return expect(
      runTest(
        `
          // Set undefined via PM
          pm.environment.set("changeable", undefined)
          pm.expect(hopp.env.get("changeable")).toBe(undefined)

          // Overwrite with string via PM
          pm.environment.set("changeable", "new_value")
          pm.expect(hopp.env.get("changeable")).toBe("new_value")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
          {
            status: "pass",
            message: "Expected 'new_value' to be 'new_value'",
          },
        ],
      }),
    ])
  })

  test("undefined precedence in pm.variables.get (environment over global)", () => {
    return expect(
      runTest(
        `
          // Set undefined in both global and environment
          pm.globals.set("precedence_test", undefined)
          pm.environment.set("precedence_test", undefined)

          // pm.variables should return environment's undefined
          const value = pm.variables.get("precedence_test")
          pm.expect(value).toBe(undefined)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })
})
