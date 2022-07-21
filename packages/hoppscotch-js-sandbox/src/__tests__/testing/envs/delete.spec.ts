import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import {
  execTestScript,
  TestResponse,
  TestScriptReport,
} from "../../../test-runner"
import "@relmify/jest-fp-ts"

const fakeResponse: TestResponse = {
  status: 0,
  headers: [],
  body: "",
}

const func = (script: string, envs: TestScriptReport["envs"]) =>
  pipe(
    execTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests)
  )

describe("pw.env.delete", () => {
  test("deletes environment variable from both selected and global", () => {
    return expect(
      func(
        `
          pw.env.delete("a")
          const data = pw.env.get("a")
          pw.expect(data).toBe(undefined)
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
              value: "b",
            },
          ],
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

  test("deletes highest precedence version of the variable from both selected and global", () => {
    return expect(
      func(
        `
          let dataGlobal = pw.env.global.get("a")
          let dataActive = pw.env.active.get("a")
          
          pw.expect(dataGlobal).toBe("b1")
          pw.expect(dataActive).toBe("b1")

          pw.env.delete("a")

          dataGlobal = pw.env.global.get("a")
          dataActive = pw.env.active.get("a")
          
          pw.expect(dataGlobal).toBe("b2")
          pw.expect(dataActive).toBe("b2")
      `,
        {
          global: [
            {
              key: "a",
              value: "b1",
            },
            {
              key: "a",
              value: "b2",
            },
          ],
          selected: [
            {
              key: "a",
              value: "b1",
            },
            {
              key: "a",
              value: "b2",
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'b1' to be 'b1'",
          },
          {
            status: "pass",
            message: "Expected 'b1' to be 'b1'",
          },
          {
            status: "pass",
            message: "Expected 'b2' to be 'b2'",
          },
          {
            status: "pass",
            message: "Expected 'b2' to be 'b2'",
          },
        ],
      }),
    ])
  })

  test("error if the key is not a string", () => {
    return expect(
      func(
        `
          pw.env.delete(5)
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("no error if key isn't in both global and selected environments", () => {
    return expect(
      func(
        `
          pw.env.delete("a")
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeRight()
  })
})
