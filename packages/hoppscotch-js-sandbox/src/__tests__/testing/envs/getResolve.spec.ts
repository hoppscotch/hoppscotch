import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execTestScript, TestResponse, TestResult } from "../../../test-runner"

import "@relmify/jest-fp-ts"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    execTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests),
    TE.mapLeft((x) => {
      console.log(x)
      return x
    })
  )

describe("pw.env.getResolve", () => {
  test("returns the correct value for an existing selected environment value", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
          pw.expect(data).toBe("b")
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

  test("returns the correct value for an existing global environment value", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
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

  test("returns undefined for a key that is not present in both selected or environment", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
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

  test("returns the value defined in selected environment if it is also present in global", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
          pw.expect(data).toBe("selected val")
      `,
        {
          global: [
            {
              key: "a",
              value: "global val",
            },
          ],
          selected: [
            {
              key: "a",
              value: "selected val",
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'selected val' to be 'selected val'",
          },
        ],
      }),
    ])
  })

  test("resolve environment values", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
          pw.expect(data).toBe("there")
      `,
        {
          global: [],
          selected: [
            {
              key: "a",
              value: "<<hello>>",
            },
            {
              key: "hello",
              value: "there",
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'there' to be 'there'",
          },
        ],
      }),
    ])
  })

  test("returns unresolved value on infinite loop in resolution", () => {
    return expect(
      func(
        `
          const data = pw.env.getResolve("a")
          pw.expect(data).toBe("<<hello>>")
      `,
        {
          global: [],
          selected: [
            {
              key: "a",
              value: "<<hello>>",
            },
            {
              key: "hello",
              value: "<<a>>",
            },
          ],
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
          const data = pw.env.getResolve(5)
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })
})
