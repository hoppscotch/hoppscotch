import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, envs, fakeResponse),
    TE.map((x) => x.envs)
  )

const funcTest = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests)
  )

describe("pw.env.set", () => {
  test("updates the selected environment variable correctly", () => {
    return expect(
      func(
        `
          pw.env.set("a", "c")
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
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "b",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates the global environment variable correctly", () => {
    return expect(
      func(
        `
          pw.env.set("a", "c")
        `,
        {
          global: [
            {
              key: "a",
              currentValue: "b",
              initialValue: "b",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "b",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates the selected environment if env present in both", () => {
    return expect(
      func(
        `
          pw.env.set("a", "c")
        `,
        {
          global: [
            {
              key: "a",
              currentValue: "b",
              initialValue: "b",
              secret: false,
            },
          ],
          selected: [
            {
              key: "a",
              currentValue: "d",
              initialValue: "d",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            currentValue: "b",
            initialValue: "b",
            secret: false,
          },
        ],
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "d",
            secret: false,
          },
        ],
      })
    )
  })

  test("non existent keys are created in the selected environment", () => {
    return expect(
      func(
        `
          pw.env.set("a", "c")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [],
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "c",
            secret: false,
          },
        ],
      })
    )
  })

  test("keys should be a string", () => {
    return expect(
      func(
        `
          pw.env.set(5, "c")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("values should be a string", () => {
    return expect(
      func(
        `
          pw.env.set("a", 5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("both keys and values should be strings", () => {
    return expect(
      func(
        `
          pw.env.set(5, 5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("set environment values are reflected in the script execution", () => {
    return expect(
      funcTest(
        `
          pw.env.set("a", "b")
          pw.expect(pw.env.get("a")).toBe("b")
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
            message: "Expected 'b' to be 'b'",
          },
        ],
      }),
    ])
  })
})
