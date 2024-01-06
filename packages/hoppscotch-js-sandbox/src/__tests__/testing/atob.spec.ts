import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { runTestScript } from "~/test-runner/node-vm"
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

describe("atob", () => {
  test("string should be base64", () => {
    return expect(
      func(
        `
          pw.env.set("atob", atob("SGVsbG8gV29ybGQ="))
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "atob",
            value: "Hello World",
          },
        ],
      })
    )
  })
})
