import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript, runPreRequestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("pm.environment", () => {
  test("pm.environment.get returns the correct value for an existing active environment value", () => {
    return expect(
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
      func(
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
