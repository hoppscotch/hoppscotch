/**
 * Environment Variable Fallback Behavior Tests
 *
 * Tests the fallback from currentValue to initialValue when currentValue is empty
 * across pm.environment and hopp.env namespaces.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

// All namespaces share the same environment variable fallback implementation
// Testing: pm.environment (active scope) and hopp.env
// Note: pm.globals uses same implementation as pm.environment, just different scope
const NAMESPACES = [
  {
    name: "pm.environment",
    get: "pm.environment.get",
    set: "pm.environment.set",
  },
  { name: "hopp.env", get: "hopp.env.get", set: "hopp.env.set" },
] as const

describe("Environment Variable Fallback Behavior - All Namespaces", () => {
  describe.each(NAMESPACES)(
    "$name - currentValue empty string fallback",
    ({ get }) => {
      test("should fallback to initialValue when currentValue is empty string", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: "", // Empty string
              initialValue: "fallback_value",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get fallback value", () => {
          pm.expect(value).to.equal("fallback_value")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should return empty string when both currentValue and initialValue are empty", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: "",
              initialValue: "",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get empty string", () => {
          pm.expect(value).to.equal("")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  describe.each(NAMESPACES)(
    "$name - currentValue undefined/null fallback",
    ({ get }) => {
      // Note: These tests check GET behavior with null/undefined in initial state.
      // Setting null via pm.environment.set(key, null) IS supported (via NULL_MARKER).
      // These tests validate fallback logic when null/undefined exists in the env state.

      test("should fallback to initialValue when currentValue is undefined", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: undefined,
              initialValue: "fallback_value",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get fallback value", () => {
          pm.expect(value).to.equal("fallback_value")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should fallback to initialValue when currentValue is null", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: null,
              initialValue: "fallback_value",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get fallback value for null", () => {
          pm.expect(value).to.equal("fallback_value")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  describe.each(NAMESPACES)(
    "$name - falsy values should NOT fallback",
    ({ get }) => {
      test("should use currentValue when it is 0 (not fallback)", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: 0,
              initialValue: 100,
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get 0, not fallback to 100", () => {
          pm.expect(value).to.equal(0)
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should use currentValue when it is false (not fallback)", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: false,
              initialValue: true,
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get false, not fallback to true", () => {
          pm.expect(value).to.equal(false)
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should use currentValue when it is empty array (not fallback)", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: [],
              initialValue: [1, 2, 3],
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get empty array, not fallback", () => {
          pm.expect(value).to.be.an("array")
          pm.expect(value.length).to.equal(0)
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should use currentValue when it is empty object (not fallback)", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: {},
              initialValue: { key: "value" },
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("testVar")
        pm.test("should get empty object, not fallback", () => {
          pm.expect(value).to.be.an("object")
          pm.expect(Object.keys(value).length).to.equal(0)
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  // NaN test - only for pm namespace which preserves non-string types
  describe("pm.environment - NaN handling", () => {
    test("should use currentValue when it is NaN (not fallback)", async () => {
      const envs = {
        global: [],
        selected: [
          {
            key: "testVar",
            currentValue: NaN,
            initialValue: 100,
            secret: false,
          },
        ],
      }

      const result = await runTest(
        `
        const value = pm.environment.get("testVar")
        pm.test("should get NaN, not fallback to 100", () => {
          pm.expect(Number.isNaN(value)).to.be.true
        })
      `,
        envs
      )()

      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe.each(NAMESPACES)(
    "$name - complex type preservation with fallback",
    ({ get }) => {
      test("should fallback to initialValue array when currentValue is empty", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "users",
              currentValue: "",
              initialValue: [
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" },
              ],
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("users")
        pm.test("should get array from initialValue", () => {
          pm.expect(value).to.be.an("array")
          pm.expect(value.length).to.equal(2)
          pm.expect(value[0].name).to.equal("Alice")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should fallback to initialValue object when currentValue is null", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "config",
              currentValue: null,
              initialValue: { debug: true, maxRetries: 3 },
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("config")
        pm.test("should get object from initialValue", () => {
          pm.expect(value).to.be.an("object")
          pm.expect(value.debug).to.equal(true)
          pm.expect(value.maxRetries).to.equal(3)
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  describe.each(NAMESPACES)(
    "$name - global vs selected scope fallback",
    ({ name, get }) => {
      test("should fallback to initialValue in global scope", async () => {
        const envs = {
          global: [
            {
              key: "globalVar",
              currentValue: "",
              initialValue: "global_fallback",
              secret: false,
            },
          ],
          selected: [],
        }

        // Use hopp.env.global.get for hopp, pm.globals.get for pm
        const globalGet =
          name === "pm.environment" ? "pm.globals.get" : "hopp.env.global.get"

        const result = await runTest(
          `
        const value = ${globalGet}("globalVar")
        pm.test("should get global fallback value", () => {
          pm.expect(value).to.equal("global_fallback")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should fallback in selected scope even when global has a value", async () => {
        const envs = {
          global: [
            {
              key: "sharedVar",
              currentValue: "global_value",
              initialValue: "global_initial",
              secret: false,
            },
          ],
          selected: [
            {
              key: "sharedVar",
              currentValue: "", // Empty in selected
              initialValue: "selected_initial",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        const value = ${get}("sharedVar")
        pm.test("should get selected scope's initialValue, not global", () => {
          pm.expect(value).to.equal("selected_initial")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  describe.each(NAMESPACES)(
    "$name - runtime modification and fallback",
    ({ get, set }) => {
      test("should use newly set value, not fallback to initialValue", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: "",
              initialValue: "initial",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        // First, verify it falls back to initialValue
        const before = ${get}("testVar")
        pm.test("before set: should get initial value", () => {
          pm.expect(before).to.equal("initial")
        })

        // Now set a new value
        ${set}("testVar", "runtime_value")

        // Verify it uses the newly set value
        const after = ${get}("testVar")
        pm.test("after set: should get runtime value", () => {
          pm.expect(after).to.equal("runtime_value")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })

      test("should fallback when currentValue is set to empty string at runtime", async () => {
        const envs = {
          global: [],
          selected: [
            {
              key: "testVar",
              currentValue: "original",
              initialValue: "fallback",
              secret: false,
            },
          ],
        }

        const result = await runTest(
          `
        // First, verify original value
        const before = ${get}("testVar")
        pm.test("before: should get original value", () => {
          pm.expect(before).to.equal("original")
        })

        // Set to empty string
        ${set}("testVar", "")

        // Should now fall back to initialValue
        const after = ${get}("testVar")
        pm.test("after setting empty: should fallback to initial", () => {
          pm.expect(after).to.equal("fallback")
        })
      `,
          envs
        )()

        expect(result).toEqualRight(
          expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  expectResults: expect.arrayContaining([
                    expect.objectContaining({ status: "pass" }),
                    expect.objectContaining({ status: "pass" }),
                  ]),
                }),
              ]),
            }),
          ])
        )
      })
    }
  )

  // PM namespace returns undefined for non-existent keys
  describe("pm.environment - non-existent variable behavior", () => {
    test("should return undefined for non-existent variable (not fallback)", async () => {
      const envs = {
        global: [],
        selected: [],
      }

      const result = await runTest(
        `
        const value = pm.environment.get("nonExistent")
        pm.test("should get undefined for non-existent", () => {
          pm.expect(value).to.be.undefined
        })
      `,
        envs
      )()

      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  // Hopp namespace returns null for non-existent keys
  describe("hopp.env - non-existent variable behavior", () => {
    test("should return null for non-existent variable (not fallback)", async () => {
      const envs = {
        global: [],
        selected: [],
      }

      const result = await runTest(
        `
        const value = hopp.env.get("nonExistent")
        pm.test("should get null for non-existent", () => {
          pm.expect(value).to.be.null
        })
      `,
        envs
      )()

      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})

// Additional tests for pm.variables which searches both scopes
describe("pm.variables - Fallback Behavior Across Scopes", () => {
  test("should fallback to initialValue in selected scope first", async () => {
    const envs = {
      global: [
        {
          key: "sharedVar",
          currentValue: "global_value",
          initialValue: "global_initial",
          secret: false,
        },
      ],
      selected: [
        {
          key: "sharedVar",
          currentValue: "",
          initialValue: "selected_initial",
          secret: false,
        },
      ],
    }

    const result = await runTest(
      `
      const value = pm.variables.get("sharedVar")
      pm.test("should get selected scope's initialValue", () => {
        pm.expect(value).to.equal("selected_initial")
      })
    `,
      envs
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should search global scope when selected scope variable doesn't exist", async () => {
    const envs = {
      global: [
        {
          key: "globalOnly",
          currentValue: "",
          initialValue: "global_fallback",
          secret: false,
        },
      ],
      selected: [],
    }

    const result = await runTest(
      `
      const value = pm.variables.get("globalOnly")
      pm.test("should get global scope's initialValue", () => {
        pm.expect(value).to.equal("global_fallback")
      })
    `,
      envs
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should return undefined when variable doesn't exist in either scope", async () => {
    const envs = {
      global: [],
      selected: [],
    }

    const result = await runTest(
      `
      const value = pm.variables.get("nonExistent")
      pm.test("should get undefined", () => {
        pm.expect(value).to.be.undefined
      })
    `,
      envs
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})
