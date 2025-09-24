import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
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

describe("pm.environment additional coverage", () => {
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

describe("pm.globals additional coverage", () => {
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

describe("pm.variables additional coverage", () => {
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

  test("pm.variables.get returns the correct value from any scope", () => {
    return expect(
      func(
        `
          const data = pm.variables.get("scopedVar")
          pw.expect(data).toBe("scopedValue")
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
