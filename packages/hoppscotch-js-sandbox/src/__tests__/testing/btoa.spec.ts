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

describe("btoa", () => {
  test("string should be base64", () => {
    return expect(
      func(
        `
          pw.env.set("btoa", btoa("Hello World"))
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "btoa",
            value: "SGVsbG8gV29ybGQ=",
          },
        ],
      })
    )
  })
})
