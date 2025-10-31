import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pm.environment additional coverage", () => {
  test("pm.environment.set creates and retrieves environment variable", () => {
    return expect(
      runTest(
        `
          pm.environment.set("test_set", "set_value")
          const retrieved = pm.environment.get("test_set")
          pm.expect(retrieved).toBe("set_value")
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

  test("pm.environment.has correctly identifies existing and non-existing variables", () => {
    return expect(
      runTest(
        `
          const hasExisting = pm.environment.has("existing_var")
          const hasNonExisting = pm.environment.has("non_existing_var")
          pm.expect(hasExisting.toString()).toBe("true")
          pm.expect(hasNonExisting.toString()).toBe("false")
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

  test("pm.environment.toObject returns all environment variables set via pm.environment.set", () => {
    return expect(
      runTest(
        `
          pm.environment.set("key1", "value1")
          pm.environment.set("key2", "value2")
          pm.environment.set("key3", "value3")
          
          const envObj = pm.environment.toObject()
          
          pm.expect(envObj.key1).toBe("value1")
          pm.expect(envObj.key2).toBe("value2")
          pm.expect(envObj.key3).toBe("value3")
          pm.expect(Object.keys(envObj).length.toString()).toBe("3")
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
            message: "Expected 'value1' to be 'value1'",
          },
          {
            status: "pass",
            message: "Expected 'value2' to be 'value2'",
          },
          {
            status: "pass",
            message: "Expected 'value3' to be 'value3'",
          },
          {
            status: "pass",
            message: "Expected '3' to be '3'",
          },
        ],
      }),
    ])
  })

  test("pm.environment.toObject returns empty object when no variables are set", () => {
    return expect(
      runTest(
        `
          const envObj = pm.environment.toObject()
          pm.expect(Object.keys(envObj).length.toString()).toBe("0")
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
            message: "Expected '0' to be '0'",
          },
        ],
      }),
    ])
  })

  test("pm.environment.clear removes all environment variables set via pm.environment.set", () => {
    return expect(
      runTest(
        `
          pm.environment.set("key1", "value1")
          pm.environment.set("key2", "value2")
          
          // Verify variables are set
          pm.expect(pm.environment.get("key1")).toBe("value1")
          pm.expect(pm.environment.get("key2")).toBe("value2")
          
          // Clear all
          pm.environment.clear()
          
          // Verify variables are cleared
          pm.expect(pm.environment.get("key1")).toBe(undefined)
          pm.expect(pm.environment.get("key2")).toBe(undefined)
          
          // Verify toObject returns empty
          const envObj = pm.environment.toObject()
          pm.expect(Object.keys(envObj).length.toString()).toBe("0")
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
            message: "Expected 'value1' to be 'value1'",
          },
          {
            status: "pass",
            message: "Expected 'value2' to be 'value2'",
          },
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
            message: "Expected '0' to be '0'",
          },
        ],
      }),
    ])
  })

  test("pm.environment.unset removes key from tracking", () => {
    return expect(
      runTest(
        `
          pm.environment.set("key1", "value1")
          pm.environment.set("key2", "value2")
          
          // Unset one key
          pm.environment.unset("key1")
          
          // Verify key1 is removed but key2 remains
          const envObj = pm.environment.toObject()
          pm.expect(envObj.key1).toBe(undefined)
          pm.expect(envObj.key2).toBe("value2")
          pm.expect(Object.keys(envObj).length.toString()).toBe("1")
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
            message: "Expected 'value2' to be 'value2'",
          },
          {
            status: "pass",
            message: "Expected '1' to be '1'",
          },
        ],
      }),
    ])
  })
})

describe("pm.globals additional coverage", () => {
  test("pm.globals.set creates and retrieves global variable", () => {
    return expect(
      runTest(
        `
          pm.globals.set("test_global", "global_value")
          const retrieved = pm.globals.get("test_global")
          pm.expect(retrieved).toBe("global_value")
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

  test("pm.globals.toObject returns all global variables set via pm.globals.set", () => {
    return expect(
      runTest(
        `
          pm.globals.set("globalKey1", "globalValue1")
          pm.globals.set("globalKey2", "globalValue2")
          pm.globals.set("globalKey3", "globalValue3")
          
          const globalObj = pm.globals.toObject()
          
          pm.expect(globalObj.globalKey1).toBe("globalValue1")
          pm.expect(globalObj.globalKey2).toBe("globalValue2")
          pm.expect(globalObj.globalKey3).toBe("globalValue3")
          pm.expect(Object.keys(globalObj).length.toString()).toBe("3")
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
            message: "Expected 'globalValue1' to be 'globalValue1'",
          },
          {
            status: "pass",
            message: "Expected 'globalValue2' to be 'globalValue2'",
          },
          {
            status: "pass",
            message: "Expected 'globalValue3' to be 'globalValue3'",
          },
          {
            status: "pass",
            message: "Expected '3' to be '3'",
          },
        ],
      }),
    ])
  })

  test("pm.globals.toObject returns empty object when no globals are set", () => {
    return expect(
      runTest(
        `
          const globalObj = pm.globals.toObject()
          pm.expect(Object.keys(globalObj).length.toString()).toBe("0")
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
            message: "Expected '0' to be '0'",
          },
        ],
      }),
    ])
  })

  test("pm.globals.clear removes all global variables set via pm.globals.set", () => {
    return expect(
      runTest(
        `
          pm.globals.set("globalKey1", "globalValue1")
          pm.globals.set("globalKey2", "globalValue2")
          
          // Verify variables are set
          pm.expect(pm.globals.get("globalKey1")).toBe("globalValue1")
          pm.expect(pm.globals.get("globalKey2")).toBe("globalValue2")
          
          // Clear all
          pm.globals.clear()
          
          // Verify variables are cleared
          pm.expect(pm.globals.get("globalKey1")).toBe(undefined)
          pm.expect(pm.globals.get("globalKey2")).toBe(undefined)
          
          // Verify toObject returns empty
          const globalObj = pm.globals.toObject()
          pm.expect(Object.keys(globalObj).length.toString()).toBe("0")
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
            message: "Expected 'globalValue1' to be 'globalValue1'",
          },
          {
            status: "pass",
            message: "Expected 'globalValue2' to be 'globalValue2'",
          },
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
            message: "Expected '0' to be '0'",
          },
        ],
      }),
    ])
  })

  test("pm.globals.clear also removes initial global variables from environment", () => {
    return expect(
      runTest(
        `
          // Verify initial globals exist
          pm.expect(pm.globals.get("initial_global1")).toBe("initial_value1")
          pm.expect(pm.globals.get("initial_global2")).toBe("initial_value2")

          // Add tracked globals
          pm.globals.set("tracked_global", "tracked_value")
          pm.expect(pm.globals.get("tracked_global")).toBe("tracked_value")

          // Verify toObject includes both initial and tracked
          const before = pm.globals.toObject()
          pm.expect(before.initial_global1).toBe("initial_value1")
          pm.expect(before.tracked_global).toBe("tracked_value")

          // Clear all (both initial and tracked)
          pm.globals.clear()

          // Verify ALL globals are cleared
          pm.expect(pm.globals.get("initial_global1")).toBe(undefined)
          pm.expect(pm.globals.get("initial_global2")).toBe(undefined)
          pm.expect(pm.globals.get("tracked_global")).toBe(undefined)

          // Verify toObject returns empty
          const after = pm.globals.toObject()
          pm.expect(Object.keys(after).length.toString()).toBe("0")
        `,
        {
          global: [
            {
              key: "initial_global1",
              currentValue: "initial_value1",
              initialValue: "initial_value1",
              secret: false,
            },
            {
              key: "initial_global2",
              currentValue: "initial_value2",
              initialValue: "initial_value2",
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
            message: "Expected 'initial_value1' to be 'initial_value1'",
          },
          {
            status: "pass",
            message: "Expected 'initial_value2' to be 'initial_value2'",
          },
          {
            status: "pass",
            message: "Expected 'tracked_value' to be 'tracked_value'",
          },
          {
            status: "pass",
            message: "Expected 'initial_value1' to be 'initial_value1'",
          },
          {
            status: "pass",
            message: "Expected 'tracked_value' to be 'tracked_value'",
          },
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected 'undefined' to be 'undefined'" },
          { status: "pass", message: "Expected '0' to be '0'" },
        ],
      }),
    ])
  })

  test("pm.globals.unset removes key from tracking", () => {
    return expect(
      runTest(
        `
          pm.globals.set("globalKey1", "globalValue1")
          pm.globals.set("globalKey2", "globalValue2")
          
          // Unset one key
          pm.globals.unset("globalKey1")
          
          // Verify key1 is removed but key2 remains
          const globalObj = pm.globals.toObject()
          pm.expect(globalObj.globalKey1).toBe(undefined)
          pm.expect(globalObj.globalKey2).toBe("globalValue2")
          pm.expect(Object.keys(globalObj).length.toString()).toBe("1")
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
            message: "Expected 'globalValue2' to be 'globalValue2'",
          },
          {
            status: "pass",
            message: "Expected '1' to be '1'",
          },
        ],
      }),
    ])
  })
})

describe("pm.variables additional coverage", () => {
  test("pm.variables.set creates and retrieves variable in active environment", () => {
    return expect(
      runTest(
        `
          pm.variables.set("test_var", "test_value")
          const retrieved = pm.variables.get("test_var")
          pm.expect(retrieved).toBe("test_value")
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
          pm.expect(hasExisting.toString()).toBe("true")
          pm.expect(hasNonExisting.toString()).toBe("false")
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

  test("pm.variables.replaceIn handles multiple variables", () => {
    return expect(
      runTest(
        `
          const template = "User {{name}} has {{count}} items in {{location}}"
          const result = pm.variables.replaceIn(template)
          pm.expect(result).toBe("User Alice has 10 items in Cart")
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
