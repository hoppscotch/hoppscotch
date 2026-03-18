import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

// Postman compatibility: all types preserved during runtime, only undefined needs special handling

describe("PM namespace type preservation (Postman compatibility)", () => {
  describe("Array preservation", () => {
    test("arrays are preserved as arrays with .length property", () => {
      return expect(
        runTest(
          `
            pm.environment.set("array", [1, 2, 3])
            const value = pm.environment.get("array")
            pm.expect(Array.isArray(value)).toBe(true)
            pm.expect(value.length).toBe(3)
            pm.expect(value[0]).toBe(1)
            pm.expect(value[2]).toBe(3)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '3' to be '3'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected '3' to be '3'" },
          ],
        }),
      ])
    })

    test("single-element arrays remain arrays", () => {
      return expect(
        runTest(
          `
            pm.environment.set("single", [42])
            const value = pm.environment.get("single")
            pm.expect(Array.isArray(value)).toBe(true)
            pm.expect(value.length).toBe(1)
            pm.expect(value[0]).toBe(42)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '1' to be '1'" },
            { status: "pass", message: "Expected '42' to be '42'" },
          ],
        }),
      ])
    })

    test("empty arrays are preserved", () => {
      return expect(
        runTest(
          `
            pm.environment.set("empty", [])
            const value = pm.environment.get("empty")
            pm.expect(Array.isArray(value)).toBe(true)
            pm.expect(value.length).toBe(0)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '0' to be '0'" },
          ],
        }),
      ])
    })

    test("nested arrays are preserved", () => {
      return expect(
        runTest(
          `
            pm.environment.set("nested", [[1, 2], [3, 4]])
            const value = pm.environment.get("nested")
            pm.expect(Array.isArray(value)).toBe(true)
            pm.expect(value.length).toBe(2)
            pm.expect(Array.isArray(value[0])).toBe(true)
            pm.expect(value[0][1]).toBe(2)
            pm.expect(value[1][0]).toBe(3)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '2' to be '2'" },
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '2' to be '2'" },
            { status: "pass", message: "Expected '3' to be '3'" },
          ],
        }),
      ])
    })
  })

  describe("Object preservation", () => {
    test("objects are preserved with accessible properties", () => {
      return expect(
        runTest(
          `
            pm.environment.set("obj", { key: "value", num: 42 })
            const value = pm.environment.get("obj")
            pm.expect(typeof value).toBe("object")
            pm.expect(value.key).toBe("value")
            pm.expect(value.num).toBe(42)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'value' to be 'value'" },
            { status: "pass", message: "Expected '42' to be '42'" },
          ],
        }),
      ])
    })

    test("empty objects are preserved", () => {
      return expect(
        runTest(
          `
            pm.environment.set("empty_obj", {})
            const value = pm.environment.get("empty_obj")
            pm.expect(typeof value).toBe("object")
            pm.expect(Array.isArray(value)).toBe(false)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'false' to be 'false'" },
          ],
        }),
      ])
    })

    test("nested objects are preserved", () => {
      return expect(
        runTest(
          `
            const original = { key: "value", nested: { prop: 123, deep: { inner: "test" } } }
            pm.environment.set("nested_obj", original)
            const retrieved = pm.environment.get("nested_obj")

            pm.expect(typeof retrieved).toBe("object")
            pm.expect(retrieved.key).toBe("value")
            pm.expect(retrieved.nested.prop).toBe(123)
            pm.expect(retrieved.nested.deep.inner).toBe("test")
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'value' to be 'value'" },
            { status: "pass", message: "Expected '123' to be '123'" },
            { status: "pass", message: "Expected 'test' to be 'test'" },
          ],
        }),
      ])
    })
  })

  describe("Null preservation", () => {
    test("null is preserved as actual null value", () => {
      return expect(
        runTest(
          `
            pm.environment.set("nullable", null)
            const value = pm.environment.get("nullable")
            pm.expect(value).toBe(null)
            pm.expect(value === null).toBe(true)
            pm.expect(typeof value).toBe("object")
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'null' to be 'null'" },
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected 'object' to be 'object'" },
          ],
        }),
      ])
    })
  })

  describe("Undefined preservation (special case)", () => {
    test("undefined is preserved as actual undefined", () => {
      return expect(
        runTest(
          `
            pm.environment.set("undef", undefined)
            const value = pm.environment.get("undef")
            pm.expect(value).toBe(undefined)
            pm.expect(typeof value).toBe("undefined")
          `,
          { global: [], selected: [] }
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
          ],
        }),
      ])
    })

    test("undefined is distinguishable from non-existent keys", () => {
      return expect(
        runTest(
          `
            pm.environment.set("explicit_undef", undefined)
            pm.expect(pm.environment.has("explicit_undef")).toBe(true)
            pm.expect(pm.environment.has("never_set")).toBe(false)
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
  })

  describe("Primitive type preservation", () => {
    test("numbers are preserved as numbers", () => {
      return expect(
        runTest(
          `
            pm.environment.set("num", 123)
            const value = pm.environment.get("num")
            pm.expect(typeof value).toBe("number")
            pm.expect(value).toBe(123)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'number' to be 'number'" },
            { status: "pass", message: "Expected '123' to be '123'" },
          ],
        }),
      ])
    })

    test("booleans are preserved as booleans", () => {
      return expect(
        runTest(
          `
            pm.environment.set("bool", true)
            const value = pm.environment.get("bool")
            pm.expect(typeof value).toBe("boolean")
            pm.expect(value).toBe(true)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'boolean' to be 'boolean'" },
            { status: "pass", message: "Expected 'true' to be 'true'" },
          ],
        }),
      ])
    })

    test("strings remain strings", () => {
      return expect(
        runTest(
          `
            pm.environment.set("str", "hello")
            const value = pm.environment.get("str")
            pm.expect(typeof value).toBe("string")
            pm.expect(value).toBe("hello")
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'string' to be 'string'" },
            { status: "pass", message: "Expected 'hello' to be 'hello'" },
          ],
        }),
      ])
    })
  })

  describe("Cross-scope type preservation", () => {
    test("pm.globals preserves arrays", () => {
      return expect(
        runTest(
          `
            pm.globals.set("global_array", [1, 2, 3])
            const value = pm.globals.get("global_array")
            pm.expect(Array.isArray(value)).toBe(true)
            pm.expect(value.length).toBe(3)
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '3' to be '3'" },
          ],
        }),
      ])
    })

    test("pm.variables preserves objects", () => {
      return expect(
        runTest(
          `
            pm.variables.set("var_obj", { key: "value" })
            const value = pm.variables.get("var_obj")
            pm.expect(typeof value).toBe("object")
            pm.expect(value.key).toBe("value")
          `,
          { global: [], selected: [] }
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'value' to be 'value'" },
          ],
        }),
      ])
    })
  })
})
