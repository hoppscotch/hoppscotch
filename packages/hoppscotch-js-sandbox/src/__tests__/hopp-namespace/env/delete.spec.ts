import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.envs)
  )

const funcTest = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("hopp.env.delete", () => {
  test("removes variable from selected environment", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, {
        global: [],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(expect.objectContaining({ selected: [] })))

  test("removes variable from global environment", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, {
        global: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [],
      })()
    ).resolves.toEqualRight(expect.objectContaining({ global: [] })))

  test("removes only from selected if present in both", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, {
        global: [
          {
            key: "baseUrl",
            currentValue: "https://httpbin.org",
            initialValue: "https://httpbin.org",
            secret: false,
          },
        ],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            currentValue: "https://httpbin.org",
            initialValue: "https://httpbin.org",
            secret: false,
          },
        ],
        selected: [],
      })
    ))

  test("removes only first matching entry if duplicates exist in selected", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, {
        global: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://httpbin.org",
            initialValue: "https://httpbin.org",
            secret: false,
          },
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })
    ))

  test("removes only first matching entry if duplicates exist in global", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, {
        global: [
          {
            key: "baseUrl",
            currentValue: "https://httpbin.org",
            initialValue: "https://httpbin.org",
            secret: false,
          },
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [],
      })
    ))

  test("no change if attempting to delete non-existent key", () =>
    expect(
      func(`hopp.env.delete("baseUrl")`, { global: [], selected: [] })()
    ).resolves.toEqualRight(
      expect.objectContaining({ global: [], selected: [] })
    ))

  test("key must be a string", () =>
    expect(
      func(`hopp.env.delete(5)`, { global: [], selected: [] })()
    ).resolves.toBeLeft())

  test("reflected in script execution", () =>
    expect(
      funcTest(
        `
          hopp.env.delete("baseUrl")
          hopp.expect(hopp.env.get("baseUrl")).toBe(null)
        `,
        {
          global: [],
          selected: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ]))
})

describe("hopp.env.active.delete", () => {
  test("removes variable from selected environment", () =>
    expect(
      func(`hopp.env.active.delete("foo")`, {
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
        global: [
          {
            key: "foo",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [],
        global: [
          {
            key: "foo",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })
    ))

  test("no effect if not present in selected", () =>
    expect(
      func(`hopp.env.active.delete("nope")`, {
        selected: [],
        global: [
          {
            key: "nope",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [],
        global: [
          {
            key: "nope",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })
    ))

  test("key must be a string", () =>
    expect(
      func(`hopp.env.active.delete({})`, { selected: [], global: [] })()
    ).resolves.toBeLeft())
})

describe("hopp.env.global.delete", () => {
  test("removes variable from global environment", () =>
    expect(
      func(`hopp.env.global.delete("foo")`, {
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
        global: [
          {
            key: "foo",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
        global: [],
      })
    ))

  test("no effect if not present in global", () =>
    expect(
      func(`hopp.env.global.delete("missing")`, {
        selected: [
          {
            key: "missing",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "missing",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
        global: [],
      })
    ))

  test("key must be a string", () =>
    expect(
      func(`hopp.env.global.delete([])`, { selected: [], global: [] })()
    ).resolves.toBeLeft())
})
