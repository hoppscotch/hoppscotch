import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse } from "~/types"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, res: TestResponse) =>
  pipe(
    runTestScript(script, { global: [], selected: [] }, res),
    TE.map((x) => x.tests)
  )

describe("toBeType", () => {
  test("asserts true for valid type expectations with no negation", () => {
    return expect(
      func(
        `
          pw.expect(2).toBeType("number")
          pw.expect("2").toBeType("string")
          pw.expect(true).toBeType("boolean")
          pw.expect({}).toBeType("object")
          pw.expect(undefined).toBeType("undefined")

          const utcDate = new Date("2025-05-22T17:42:26Z")
          const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in ms
          const istDate = new Date(utcDate.getTime() + istOffset)

          pw.expect(istDate).toBeType("object")
          pw.expect(istDate.toISOString()).toBeType("string")
          pw.expect(JSON.stringify(istDate)).toBeType("string")
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
          {
            message: expect.stringMatching(/to be type 'object'$/),
            status: "pass",
          },
          {
            message: "Expected '2025-05-22T23:12:26.000Z' to be type 'string'",
            status: "pass",
          },
          {
            message: `Expected '"2025-05-22T23:12:26.000Z"' to be type 'string'`,
            status: "pass",
          },
        ],
      }),
    ])
  })

  test("asserts false for invalid type expectations with no negation", () => {
    return expect(
      func(
        `
          pw.expect(2).toBeType("string")
          pw.expect("2").toBeType("number")
          pw.expect(true).toBeType("string")
          pw.expect({}).toBeType("number")
          pw.expect(undefined).toBeType("number")
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
          pw.expect(2).not.toBeType("number")
          pw.expect("2").not.toBeType("string")
          pw.expect(true).not.toBeType("boolean")
          pw.expect({}).not.toBeType("object")
          pw.expect(undefined).not.toBeType("undefined")
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
          pw.expect(2).not.toBeType("string")
          pw.expect("2").not.toBeType("number")
          pw.expect(true).not.toBeType("string")
          pw.expect({}).not.toBeType("number")
          pw.expect(undefined).not.toBeType("number")

          const utcDate = new Date("2025-05-22T17:42:26Z")
          const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in ms
          const istDate = new Date(utcDate.getTime() + istOffset)

          pw.expect(istDate).not.toBeType("string")
          pw.expect(istDate.toISOString()).not.toBeType("object")
          pw.expect(JSON.stringify(istDate)).not.toBeType("object")
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
          {
            message: expect.stringMatching(/to not be type 'string'$/),
            status: "pass",
          },
          {
            message:
              "Expected '2025-05-22T23:12:26.000Z' to not be type 'object'",
            status: "pass",
          },
          {
            message: `Expected '"2025-05-22T23:12:26.000Z"' to not be type 'object'`,
            status: "pass",
          },
        ],
      }),
    ])
  })

  test("gives error for invalid type names without negation", () => {
    return expect(
      func(
        `
          pw.expect(2).toBeType("foo")
          pw.expect("2").toBeType("bar")
          pw.expect(true).toBeType("baz")
          pw.expect({}).toBeType("qux")
          pw.expect(undefined).toBeType("quux")
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
          pw.expect(2).not.toBeType("foo")
          pw.expect("2").not.toBeType("bar")
          pw.expect(true).not.toBeType("baz")
          pw.expect({}).not.toBeType("qux")
          pw.expect(undefined).not.toBeType("quux")
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
