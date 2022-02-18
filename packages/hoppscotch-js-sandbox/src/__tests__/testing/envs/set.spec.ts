import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execTestScript, TestResponse, TestResult } from "../../../test-runner"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    execTestScript(script, envs, fakeResponse),
    TE.map((x) => x.envs)
  )

const funcTest = (script: string, envs: TestResult["envs"]) =>
  pipe(
    execTestScript(script, envs, fakeResponse),
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
              value: "b",
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "a",
            value: "c",
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
              value: "b",
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
            value: "c",
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
              value: "b",
            },
          ],
          selected: [
            {
              key: "a",
              value: "d",
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            value: "b",
          },
        ],
        selected: [
          {
            key: "a",
            value: "c",
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
            value: "c",
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
