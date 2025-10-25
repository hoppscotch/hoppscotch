import { describe, expect, test } from "vitest"
import { runTest, runTestAndGetEnvs } from "~/utils/test-helpers"
import { runPreRequestScript } from "~/node"
import { getDefaultRESTRequest } from "@hoppscotch/data"

const DEFAULT_REQUEST = getDefaultRESTRequest()

// Undefined marker pattern ensures values survive serialization

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

  test("pw.env.get can read undefined set by pm.environment.set in pre-request", () => {
    return expect(
      runPreRequestScript(
        `
          pm.environment.set("env_undef_pre", undefined)
          // Verify pw.env.get can read the undefined value
          const value = pw.env.get("env_undef_pre")
          // Store the result to verify it was read correctly
          pw.env.set("read_result", value === undefined ? "success" : "failed")
        `,
        {
          envs: {
            global: [],
            selected: [],
          },
          request: DEFAULT_REQUEST,
          cookies: null,
          experimentalScriptingSandbox: true,
        }
      )()
    ).resolves.toEqualRight({
      updatedEnvs: {
        global: [],
        selected: [
          {
            key: "env_undef_pre",
            currentValue: "undefined", // Converted from UNDEFINED_MARKER
            initialValue: "undefined",
            secret: false,
          },
          {
            key: "read_result",
            currentValue: "success", // Confirms pw.env.get returned undefined
            initialValue: "success",
            secret: false,
          },
        ],
      },
      updatedRequest: DEFAULT_REQUEST,
      updatedCookies: null,
    })
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
