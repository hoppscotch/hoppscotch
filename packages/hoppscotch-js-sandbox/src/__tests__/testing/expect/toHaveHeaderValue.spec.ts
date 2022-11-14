import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execTestScript, TestResponse } from "../../../test-runner"
import "@relmify/jest-fp-ts"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [
    { key: "content-type", value: "application/text" },
    { key: "content-length", value: "20030519" },
  ],
}

const func = (script: string, res: TestResponse) =>
  pipe(
    execTestScript(script, { global: [], selected: [] }, res),
    TE.map((x) => x.tests)
  )

describe("toHaveHeaderValue", () => {
  test("assertion passes for valid header and value", async () => {
    expect(
      func(
        `pw.expect(pw.response.headers).toHaveHeaderValue("content-length:20030519")`,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: `Header, content-length is 20030519`,
          },
        ],
      }),
    ])
  })

  test("assertion passes for valid header but wrong value", async () => {
    expect(
      func(
        `pw.expect(pw.response.headers).toHaveHeaderValue("content-length:200314010404")`,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "fail",
            message: `Header, content-length is 20030519, expected 200314010404`,
          },
        ],
      }),
    ])
  })

  test("assertion passes for not-clause valid header and value", async () => {
    expect(
      func(
        `pw.expect(pw.response.headers).not.toHaveHeaderValue("content-length:200314010404")`,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: `Header, content-length is not 200314010404`,
          },
        ],
      }),
    ])
  })

  test("assertion fails for absence of header", async () => {
    expect(
      func(
        `pw.expect(pw.response.headers).toHaveHeaderValue("access-control-allow-origin:hoppscotch.io")`,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "fail",
            message: `Header, access-control-allow-origin is missing to test`,
          },
        ],
      }),
    ])
  })
})
