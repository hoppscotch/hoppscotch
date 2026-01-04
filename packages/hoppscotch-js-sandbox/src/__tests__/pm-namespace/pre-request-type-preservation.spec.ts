import { describe, expect, test } from "vitest"
import { getDefaultRESTRequest } from "@hoppscotch/data"
import { runPreRequestScript } from "~/node"

const DEFAULT_REQUEST = getDefaultRESTRequest()

// Pre-request scripts use markers to preserve null/undefined across serialization

describe("PM namespace type preservation in pre-request context", () => {
  const emptyEnvs = {
    envs: {
      global: [],
      selected: [],
    },
    request: DEFAULT_REQUEST,
  }

  describe("pm.environment.set() type preservation", () => {
    test("preserves arrays (not String() coercion to '1,2,3')", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('testArray', [1, 2, 3])
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "testArray",
              currentValue: "[1,2,3]", // JSON stringified for UI display
              initialValue: "[1,2,3]",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves objects (not String() coercion to '[object Object]')", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('testObj', { foo: 'bar', num: 42 })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "testObj",
              currentValue: '{"foo":"bar","num":42}', // JSON stringified for UI display
              secret: false,
              initialValue: '{"foo":"bar","num":42}',
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves null with NULL_MARKER", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('nullValue', null)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "nullValue",
              currentValue: "null", // Converted from NULL_MARKER by getUpdatedEnvs
              initialValue: "null",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves undefined with UNDEFINED_MARKER", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('undefinedValue', undefined)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "undefinedValue",
              currentValue: "undefined", // Converted from UNDEFINED_MARKER by getUpdatedEnvs
              initialValue: "undefined",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves nested structures", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('nested', {
              users: [
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" }
              ],
              meta: { count: 2, filters: ["active", "verified"] }
            })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "nested",
              currentValue:
                '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"meta":{"count":2,"filters":["active","verified"]}}',
              initialValue:
                '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"meta":{"count":2,"filters":["active","verified"]}}',
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves primitives correctly", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('str', 'hello')
            pm.environment.set('num', 42)
            pm.environment.set('bool', true)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "str",
              currentValue: "hello",
              initialValue: "hello",
              secret: false,
            },
            {
              key: "num",
              currentValue: "42", // Converted to string for UI compatibility
              initialValue: "42",
              secret: false,
            },
            {
              key: "bool",
              currentValue: "true", // Converted to string for UI compatibility
              initialValue: "true",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })
  })

  describe("pm.globals.set() type preservation", () => {
    test("preserves arrays in globals", () => {
      return expect(
        runPreRequestScript(
          `
            pm.globals.set('globalArray', [10, 20, 30])
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [
            {
              key: "globalArray",
              currentValue: "[10,20,30]",
              initialValue: "[10,20,30]",
              secret: false,
            },
          ],
          selected: [],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves objects in globals", () => {
      return expect(
        runPreRequestScript(
          `
            pm.globals.set('globalObj', { env: 'prod', port: 8080 })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [
            {
              key: "globalObj",
              currentValue: '{"env":"prod","port":8080}',
              initialValue: '{"env":"prod","port":8080}',
              secret: false,
            },
          ],
          selected: [],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves null in globals", () => {
      return expect(
        runPreRequestScript(
          `
            pm.globals.set('globalNull', null)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [
            {
              key: "globalNull",
              currentValue: "null", // Converted from NULL_MARKER
              initialValue: "null",
              secret: false,
            },
          ],
          selected: [],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves undefined in globals", () => {
      return expect(
        runPreRequestScript(
          `
            pm.globals.set('globalUndefined', undefined)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [
            {
              key: "globalUndefined",
              currentValue: "undefined", // Converted from UNDEFINED_MARKER
              initialValue: "undefined",
              secret: false,
            },
          ],
          selected: [],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })
  })

  describe("pm.variables.set() type preservation", () => {
    test("preserves arrays (uses active scope)", () => {
      return expect(
        runPreRequestScript(
          `
            pm.variables.set('varArray', [5, 10, 15])
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "varArray",
              currentValue: "[5,10,15]",
              initialValue: "[5,10,15]",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves objects", () => {
      return expect(
        runPreRequestScript(
          `
            pm.variables.set('varObj', { status: 'active', count: 100 })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "varObj",
              currentValue: '{"status":"active","count":100}',
              initialValue: '{"status":"active","count":100}',
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("preserves null", () => {
      return expect(
        runPreRequestScript(
          `
            pm.variables.set('varNull', null)
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "varNull",
              currentValue: "null",
              initialValue: "null",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })
  })

  describe("Regression tests for String() coercion bug", () => {
    test("does NOT convert [1,2,3] to '1,2,3' string", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('arr', [1, 2, 3])
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "arr",
              currentValue: "[1,2,3]", // JSON stringified for UI display
              initialValue: "[1,2,3]",
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("does NOT convert object to '[object Object]'", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('obj', { foo: 'bar' })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "obj",
              currentValue: '{"foo":"bar"}', // Object (JSON string for UI), not "[object Object]" string
              initialValue: '{"foo":"bar"}',
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })
  })

  describe("Complex scenarios", () => {
    test("mixed array of primitives, null, undefined, objects", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('mixed', [
              'string',
              42,
              true,
              null,
              undefined,
              [1, 2],
              { key: 'value' }
            ])
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          global: [],
          selected: [
            {
              key: "mixed",
              currentValue:
                '["string",42,true,null,null,[1,2],{"key":"value"}]',
              initialValue:
                '["string",42,true,null,null,[1,2],{"key":"value"}]', // JSON stringified for UI display
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })

    test("multiple PM namespace calls in same pre-request", () => {
      return expect(
        runPreRequestScript(
          `
            pm.environment.set('arr1', [1, 2])
            pm.globals.set('arr2', [3, 4])
            pm.variables.set('arr3', [5, 6])
            pm.environment.set('obj1', { a: 1 })
            pm.globals.set('obj2', { b: 2 })
          `,
          emptyEnvs
        )()
      ).resolves.toEqualRight({
        updatedEnvs: {
          selected: [
            {
              key: "arr1",
              currentValue: "[1,2]",
              initialValue: "[1,2]",
              secret: false,
            },
            {
              key: "arr3",
              currentValue: "[5,6]",
              initialValue: "[5,6]",
              secret: false,
            },
            {
              key: "obj1",
              currentValue: '{"a":1}',
              initialValue: '{"a":1}',
              secret: false,
            },
          ],
          global: [
            {
              key: "arr2",
              currentValue: "[3,4]",
              initialValue: "[3,4]",
              secret: false,
            },
            {
              key: "obj2",
              currentValue: '{"b":2}',
              initialValue: '{"b":2}',
              secret: false,
            },
          ],
        },
        updatedRequest: DEFAULT_REQUEST,
        updatedCookies: null,
      })
    })
  })
})
