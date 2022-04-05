import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execTestScript, TestResponse } from "../../../test-runner"

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

describe("toInclude", () => {
  test("asserts true for collections with matching values", () => {
    return expect(
      func(
        `
          pw.expect([1, 2, 3]).toInclude(1)
          pw.expect("123").toInclude(1)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected [1,2,3] to include 1" },
          { status: "pass", message: 'Expected "123" to include 1' },
        ],
      }),
    ])
  })

  test("asserts false for collections without matching values", () => {
    return expect(
      func(
        `
          pw.expect([1, 2, 3]).toInclude(4)
          pw.expect("123").toInclude(4)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "fail", message: "Expected [1,2,3] to include 4" },
          { status: "fail", message: 'Expected "123" to include 4' },
        ],
      }),
    ])
  })

  test("asserts false for empty collections", () => {
    return expect(
      func(
        `
          pw.expect([]).not.toInclude(0)
          pw.expect("").not.toInclude(0)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected [] to not include 0",
          },
          {
            status: "pass",
            message: 'Expected "" to not include 0',
          },
        ],
      }),
    ])
  })

  test("asserts false for [number array].includes(string)", () => {
    return expect(
      func(
        `
          pw.expect([1]).not.toInclude("1")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: 'Expected [1] to not include "1"',
          },
        ],
      }),
    ])
  })

  test("asserts true for [string].includes(number)", () => {
    // This is a Node.js quirk.
    // (`"123".includes(123)` returns `True` in Node.js v14.19.1)
    // See https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.includes
    return expect(
      func(`pw.expect("123").toInclude(123)`, fakeResponse)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: 'Expected "123" to include 123',
          },
        ],
      }),
    ])
  })

  test("gives error if not called on an array or string", () => {
    return expect(
      func(
        `
          pw.expect(5).not.toInclude(0)
          pw.expect(true).not.toInclude(0)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "error",
            message: "Expected toInclude to be called for an array or string",
          },
          {
            status: "error",
            message: "Expected toInclude to be called for an array or string",
          },
        ],
      }),
    ])
  })

  test("gives an error if toInclude parameter is null", () => {
    return expect(
      func(
        `
          pw.expect([1, 2, 3, 4]).not.toInclude(null)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "error",
            message: "Argument for toInclude should not be null",
          },
        ],
      }),
    ])
  })

  test("gives an error if toInclude parameter is undefined", () => {
    return expect(
      func(
        `
          pw.expect([1, 2, 3, 4]).not.toInclude(undefined)
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "error",
            message: "Argument for toInclude should not be undefined",
          },
        ],
      }),
    ])
  })
})
