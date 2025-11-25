import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { runPreRequestScript } from "~/node"
import { runTest } from "~/utils/test-helpers"

describe("pm.environment", () => {
  test("pm.environment.get returns the correct value for an existing active environment value", () => {
    return expect(
      runTest(
        `
          const data = pm.environment.get("a")
          pm.expect(data).toBe("b")
        `,
        {
          global: [],
          selected: [
            {
              key: "a",
              currentValue: "b",
              initialValue: "b",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'b' to be 'b'" }],
      }),
    ])
  })

  test("pm.environment.set creates and retrieves environment variable", () => {
    return expect(
      runTest(
        `
          pm.environment.set("test_set", "set_value")
          const retrieved = pm.environment.get("test_set")
          pw.expect(retrieved).toBe("set_value")
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
            message: "Expected 'set_value' to be 'set_value'",
          },
        ],
      }),
    ])
  })

  test("pm.environment.set works correctly", () => {
    return expect(
      runTest(
        `
          pm.environment.set("newVar", "newValue")
          const data = pm.environment.get("newVar")
          pm.expect(data).toBe("newValue")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'newValue' to be 'newValue'" },
        ],
      }),
    ])
  })

  test("pm.environment.has correctly identifies existing and non-existing variables", () => {
    return expect(
      runTest(
        `
          const hasExisting = pm.environment.has("existing_var")
          const hasNonExisting = pm.environment.has("non_existing_var")
          pw.expect(hasExisting.toString()).toBe("true")
          pw.expect(hasNonExisting.toString()).toBe("false")
        `,
        {
          global: [],
          selected: [
            {
              key: "existing_var",
              currentValue: "existing_value",
              initialValue: "existing_value",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'true' to be 'true'",
          },
          {
            status: "pass",
            message: "Expected 'false' to be 'false'",
          },
        ],
      }),
    ])
  })
})

describe("pm.globals", () => {
  test("pm.globals.get returns the correct value for an existing global environment value", () => {
    return expect(
      runTest(
        `
          const data = pm.globals.get("globalVar")
          pm.expect(data).toBe("globalValue")
        `,
        {
          global: [
            {
              key: "globalVar",
              currentValue: "globalValue",
              initialValue: "globalValue",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'globalValue' to be 'globalValue'",
          },
        ],
      }),
    ])
  })

  test("pm.globals.set creates and retrieves global variable", () => {
    return expect(
      runTest(
        `
          pm.globals.set("test_global", "global_value")
          const retrieved = pm.globals.get("test_global")
          pw.expect(retrieved).toBe("global_value")
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
            message: "Expected 'global_value' to be 'global_value'",
          },
        ],
      }),
    ])
  })
})

describe("pm.variables", () => {
  test("pm.variables.get returns the correct value from any scope", () => {
    return expect(
      runTest(
        `
          const data = pm.variables.get("scopedVar")
          pm.expect(data).toBe("scopedValue")
        `,
        {
          global: [
            {
              key: "scopedVar",
              currentValue: "scopedValue",
              initialValue: "scopedValue",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'scopedValue' to be 'scopedValue'",
          },
        ],
      }),
    ])
  })

  test("pm.variables.set creates and retrieves variable in active environment", () => {
    return expect(
      runTest(
        `
          pm.variables.set("test_var", "test_value")
          const retrieved = pm.variables.get("test_var")
          pw.expect(retrieved).toBe("test_value")
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
            message: "Expected 'test_value' to be 'test_value'",
          },
        ],
      }),
    ])
  })

  test("pm.variables.has correctly identifies existing and non-existing variables", () => {
    return expect(
      runTest(
        `
          const hasExisting = pm.variables.has("existing_var")
          const hasNonExisting = pm.variables.has("non_existing_var")
          pw.expect(hasExisting.toString()).toBe("true")
          pw.expect(hasNonExisting.toString()).toBe("false")
        `,
        {
          global: [],
          selected: [
            {
              key: "existing_var",
              currentValue: "existing_value",
              initialValue: "existing_value",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'true' to be 'true'",
          },
          {
            status: "pass",
            message: "Expected 'false' to be 'false'",
          },
        ],
      }),
    ])
  })

  test("pm.variables.replaceIn works correctly", () => {
    return expect(
      runTest(
        `
          const template = "Hello {{name}}, welcome to {{place}}!"
          const result = pm.variables.replaceIn(template)
          pm.expect(result).toBe("Hello World, welcome to Hoppscotch!")
        `,
        {
          global: [],
          selected: [
            {
              key: "name",
              currentValue: "World",
              initialValue: "World",
              secret: false,
            },
            {
              key: "place",
              currentValue: "Hoppscotch",
              initialValue: "Hoppscotch",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message:
              "Expected 'Hello World, welcome to Hoppscotch!' to be 'Hello World, welcome to Hoppscotch!'",
          },
        ],
      }),
    ])
  })

  test("pm.variables.replaceIn handles multiple variables", () => {
    return expect(
      runTest(
        `
          const template = "User {{name}} has {{count}} items in {{location}}"
          const result = pm.variables.replaceIn(template)
          pw.expect(result).toBe("User Alice has 10 items in Cart")
        `,
        {
          global: [
            {
              key: "location",
              currentValue: "Cart",
              initialValue: "Cart",
              secret: false,
            },
          ],
          selected: [
            {
              key: "name",
              currentValue: "Alice",
              initialValue: "Alice",
              secret: false,
            },
            {
              key: "count",
              currentValue: "10",
              initialValue: "10",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message:
              "Expected 'User Alice has 10 items in Cart' to be 'User Alice has 10 items in Cart'",
          },
        ],
      }),
    ])
  })
})

describe("pm.test", () => {
  test("pm.test works as expected", () => {
    return expect(
      runTest(
        `
          pm.test("Simple test", function() {
            pm.expect(1 + 1).toBe(2)
          })
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Simple test",
            expectResults: [
              { status: "pass", message: "Expected '2' to be '2'" },
            ],
          }),
        ],
      }),
    ])
  })
})

describe("pm environment get() null vs undefined behavior", () => {
  test("pm.environment.get() returns undefined (not null) for non-existent keys", () => {
    return expect(
      runTest(
        `
          const value = pm.environment.get("non_existent_key")
          pw.expect(value).toBe(undefined)
          pw.expect(value === null).toBe(false)
          pw.expect(value === undefined).toBe(true)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
          { status: "pass", message: "Expected 'true' to be 'true'" },
        ],
      }),
    ])
  })

  test("pm.globals.get() returns undefined (not null) for non-existent keys", () => {
    return expect(
      runTest(
        `
          const value = pm.globals.get("non_existent_global")
          pw.expect(value).toBe(undefined)
          pw.expect(value === null).toBe(false)
          pw.expect(value === undefined).toBe(true)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
          { status: "pass", message: "Expected 'true' to be 'true'" },
        ],
      }),
    ])
  })

  test("pm.variables.get() returns undefined (not null) for non-existent keys", () => {
    return expect(
      runTest(
        `
          const value = pm.variables.get("non_existent_var")
          pw.expect(value).toBe(undefined)
          pw.expect(value === null).toBe(false)
          pw.expect(value === undefined).toBe(true)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
          { status: "pass", message: "Expected 'true' to be 'true'" },
        ],
      }),
    ])
  })
})

describe("pm environment clear() and toObject() methods", () => {
  test("pm.environment.clear() removes all environment variables", () => {
    return expect(
      runTest(
        `
          // Set some variables
          pm.environment.set("var1", "value1")
          pm.environment.set("var2", "value2")
          pm.environment.set("var3", "value3")

          // Verify they exist
          pw.expect(pm.environment.has("var1")).toBe(true)
          pw.expect(pm.environment.has("var2")).toBe(true)
          pw.expect(pm.environment.has("var3")).toBe(true)

          // Clear all
          pm.environment.clear()

          // Verify all are removed
          pw.expect(pm.environment.has("var1")).toBe(false)
          pw.expect(pm.environment.has("var2")).toBe(false)
          pw.expect(pm.environment.has("var3")).toBe(false)

          // Verify toObject returns empty
          const allVars = pm.environment.toObject()
          pw.expect(Object.keys(allVars).length).toBe(0)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: expect.arrayContaining([
          { status: "pass", message: "Expected 'true' to be 'true'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
          { status: "pass", message: "Expected '0' to be '0'" },
        ]),
      }),
    ])
  })

  test("pm.environment.toObject() returns all environment variables as object", () => {
    return expect(
      runTest(
        `
          const allVars = pm.environment.toObject()
          pw.expect(typeof allVars).toBe("object")
          pw.expect(allVars.existing_var).toBe("existing_value")
        `,
        {
          global: [],
          selected: [
            {
              key: "existing_var",
              currentValue: "existing_value",
              initialValue: "existing_value",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'object' to be 'object'",
          },
          {
            status: "pass",
            message: "Expected 'existing_value' to be 'existing_value'",
          },
        ],
      }),
    ])
  })

  test("pm.globals.clear() removes all global variables", () => {
    return expect(
      runTest(
        `
          // Set some globals
          pm.globals.set("global1", "value1")
          pm.globals.set("global2", "value2")

          // Verify they exist
          pw.expect(pm.globals.has("global1")).toBe(true)
          pw.expect(pm.globals.has("global2")).toBe(true)

          // Clear all
          pm.globals.clear()

          // Verify all are removed
          pw.expect(pm.globals.has("global1")).toBe(false)
          pw.expect(pm.globals.has("global2")).toBe(false)

          // Verify toObject returns empty
          const allGlobals = pm.globals.toObject()
          pw.expect(Object.keys(allGlobals).length).toBe(0)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: expect.arrayContaining([
          { status: "pass", message: "Expected 'true' to be 'true'" },
          { status: "pass", message: "Expected 'false' to be 'false'" },
          { status: "pass", message: "Expected '0' to be '0'" },
        ]),
      }),
    ])
  })

  test("pm.globals.toObject() returns all global variables as object", () => {
    return expect(
      runTest(
        `
          const allGlobals = pm.globals.toObject()
          pw.expect(typeof allGlobals).toBe("object")
          pw.expect(allGlobals.global_var).toBe("global_value")
        `,
        {
          global: [
            {
              key: "global_var",
              currentValue: "global_value",
              initialValue: "global_value",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'object' to be 'object'",
          },
          {
            status: "pass",
            message: "Expected 'global_value' to be 'global_value'",
          },
        ],
      }),
    ])
  })
})

describe("pm namespace - pre-request scripts", () => {
  const DEFAULT_REQUEST = getDefaultRESTRequest()

  test("pm.environment works in pre-request scripts", () => {
    return expect(
      runPreRequestScript(
        `
          pm.environment.set("preReqVar", "preReqValue")
          const retrieved = pm.environment.get("preReqVar")
          console.log("Retrieved:", retrieved)
        `,
        {
          envs: {
            global: [],
            selected: [],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedEnvs: expect.objectContaining({
          selected: expect.arrayContaining([
            expect.objectContaining({
              key: "preReqVar",
              currentValue: "preReqValue",
            }),
          ]),
        }),
      })
    )
  })

  test("pm.globals works in pre-request scripts", () => {
    return expect(
      runPreRequestScript(
        `
          pm.globals.set("globalPreReq", "globalPreValue")
        `,
        {
          envs: {
            global: [],
            selected: [],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedEnvs: expect.objectContaining({
          global: expect.arrayContaining([
            expect.objectContaining({
              key: "globalPreReq",
              currentValue: "globalPreValue",
            }),
          ]),
        }),
      })
    )
  })

  test("pm.variables.set works in pre-request scripts", () => {
    return expect(
      runPreRequestScript(
        `
          pm.variables.set("varPreReq", "varPreValue")
        `,
        {
          envs: {
            global: [],
            selected: [],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedEnvs: expect.objectContaining({
          selected: expect.arrayContaining([
            expect.objectContaining({
              key: "varPreReq",
              currentValue: "varPreValue",
            }),
          ]),
        }),
      })
    )
  })
})
