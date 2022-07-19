import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import {
  execTestScript,
  TestResponse,
  TestScriptReport,
} from "../../../../test-runner"
import "@relmify/jest-fp-ts"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestScriptReport["envs"]) =>
  pipe(
    execTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests)
  )

describe("pw.env.global.get", () => {
  test("returns the correct value for an existing global environment value", () => {
    return expect(
      func(
        `
          const data = pw.env.global.get("a")
          pw.expect(data).toBe("b")
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

  test("returns undefined for a key that is not present in global environment", () => {
    return expect(
      func(
        `
          const data = pw.env.global.get("a")
          pw.expect(data).toBe(undefined)
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

  test("does not resolve environment values", () => {
    return expect(
      func(
        `
          const data = pw.env.global.get("a")
          pw.expect(data).toBe("<<hello>>")
      `,
        {
          global: [
            {
              key: "a",
              value: "<<hello>>",
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
            message: "Expected '<<hello>>' to be '<<hello>>'",
          },
        ],
      }),
    ])
  })

  test("errors if the key is not a string", () => {
    return expect(
      func(
        `
          const data = pw.env.global.get(5)
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })
})
