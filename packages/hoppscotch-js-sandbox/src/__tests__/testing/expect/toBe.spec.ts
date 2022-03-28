import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execTestScript, TestResponse } from "../../../test-runner"
import "@relmify/jest-fp-ts"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, res: TestResponse) =>
  pipe(
    execTestScript(script, { global: [], selected: [] }, res),
    TE.map((x) => x.tests)
  )

describe("toBe", () => {
  describe("general assertion (no negation)", () => {
    test("expect equals expected passes assertion", () => {
      return expect(
        func(
          `
              pw.expect(2).toBe(2)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected '2' to be '2'" },
          ],
        }),
      ])
    })

    test("expect not equals expected fails assertion", () => {
      return expect(
        func(
          `
              pw.expect(2).toBe(4)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "fail", message: "Expected '2' to be '4'" },
          ],
        }),
      ])
    })
  })

  describe("general assertion (with negation)", () => {
    test("expect equals expected fails assertion", () => {
      return expect(
        func(
          `
            pw.expect(2).not.toBe(2)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "fail",
              message: "Expected '2' to not be '2'",
            },
          ],
        }),
      ])
    })

    test("expect not equals expected passes assertion", () => {
      return expect(
        func(
          `
              pw.expect(2).not.toBe(4)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '2' to not be '4'",
            },
          ],
        }),
      ])
    })
  })
})

test("strict checks types", () => {
  return expect(
    func(
      `
          pw.expect(2).toBe("2")
        `,
      fakeResponse
    )()
  ).resolves.toEqualRight([
    expect.objectContaining({
      expectResults: [
        {
          status: "fail",
          message: "Expected '2' to be '2'",
        },
      ],
    }),
  ])
})
