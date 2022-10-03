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

describe("toBeType", () => {
  test("asserts true for valid type expectations with no negation", () => {
    return expect(
      func(
        `
          expect(2).toBeType("number")
          expect("2").toBeType("string")
          expect(true).toBeType("boolean")
          expect({}).toBeType("object")
          expect(undefined).toBeType("undefined")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: `Expected '2' to be type 'number'` },
          { status: "pass", message: `Expected '2' to be type 'string'` },
          { status: "pass", message: `Expected 'true' to be type 'boolean'` },
          {
            status: "pass",
            message: `Expected '[object Object]' to be type 'object'`,
          },
          {
            status: "pass",
            message: `Expected 'undefined' to be type 'undefined'`,
          },
        ],
      }),
    ])
  })

  test("asserts false for invalid type expectations with no negation", () => {
    return expect(
      func(
        `
          expect(2).toBeType("string")
          expect("2").toBeType("number")
          expect(true).toBeType("string")
          expect({}).toBeType("number")
          expect(undefined).toBeType("number")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "fail", message: `Expected '2' to be type 'string'` },
          { status: "fail", message: `Expected '2' to be type 'number'` },
          { status: "fail", message: `Expected 'true' to be type 'string'` },
          {
            status: "fail",
            message: `Expected '[object Object]' to be type 'number'`,
          },
          {
            status: "fail",
            message: `Expected 'undefined' to be type 'number'`,
          },
        ],
      }),
    ])
  })

  test("asserts false for valid type expectations with negation", () => {
    return expect(
      func(
        `
          expect(2).not.toBeType("number")
          expect("2").not.toBeType("string")
          expect(true).not.toBeType("boolean")
          expect({}).not.toBeType("object")
          expect(undefined).not.toBeType("undefined")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "fail", message: `Expected '2' to not be type 'number'` },
          { status: "fail", message: `Expected '2' to not be type 'string'` },
          {
            status: "fail",
            message: `Expected 'true' to not be type 'boolean'`,
          },
          {
            status: "fail",
            message: `Expected '[object Object]' to not be type 'object'`,
          },
          {
            status: "fail",
            message: `Expected 'undefined' to not be type 'undefined'`,
          },
        ],
      }),
    ])
  })

  test("asserts true for invalid type expectations with negation", () => {
    return expect(
      func(
        `
          expect(2).not.toBeType("string")
          expect("2").not.toBeType("number")
          expect(true).not.toBeType("string")
          expect({}).not.toBeType("number")
          expect(undefined).not.toBeType("number")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: `Expected '2' to not be type 'string'` },
          { status: "pass", message: `Expected '2' to not be type 'number'` },
          {
            status: "pass",
            message: `Expected 'true' to not be type 'string'`,
          },
          {
            status: "pass",
            message: `Expected '[object Object]' to not be type 'number'`,
          },
          {
            status: "pass",
            message: `Expected 'undefined' to not be type 'number'`,
          },
        ],
      }),
    ])
  })

  test("gives error for invalid type names without negation", () => {
    return expect(
      func(
        `
          expect(2).toBeType("foo")
          expect("2").toBeType("bar")
          expect(true).toBeType("baz")
          expect({}).toBeType("qux")
          expect(undefined).toBeType("quux")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
        ],
      }),
    ])
  })

  test("gives error for invalid type names with negation", () => {
    return expect(
      func(
        `
          expect(2).not.toBeType("foo")
          expect("2").not.toBeType("bar")
          expect(true).not.toBeType("baz")
          expect({}).not.toBeType("qux")
          expect(undefined).not.toBeType("quux")
        `,
        fakeResponse
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
          {
            status: "error",
            message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
          },
        ],
      }),
    ])
  })
})
