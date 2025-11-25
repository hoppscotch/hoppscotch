import { describe, expect, test } from "vitest"
import { runTestAndGetEnvs, runTest } from "~/utils/test-helpers"

describe("hopp.env.delete", () => {
  test("removes variable from selected environment", () =>
    expect(
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
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
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
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
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
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
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
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
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
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
      runTestAndGetEnvs(`hopp.env.delete("baseUrl")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({ global: [], selected: [] })
    ))

  test("key must be a string", () =>
    expect(
      runTestAndGetEnvs(`hopp.env.delete(5)`, { global: [], selected: [] })()
    ).resolves.toBeLeft())

  test("reflected in script execution", () =>
    expect(
      runTest(
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
      runTestAndGetEnvs(`hopp.env.active.delete("foo")`, {
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
      runTestAndGetEnvs(`hopp.env.active.delete("nope")`, {
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
      runTestAndGetEnvs(`hopp.env.active.delete({})`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft())
})

describe("hopp.env.global.delete", () => {
  test("removes variable from global environment", () =>
    expect(
      runTestAndGetEnvs(`hopp.env.global.delete("foo")`, {
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
      runTestAndGetEnvs(`hopp.env.global.delete("missing")`, {
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
      runTestAndGetEnvs(`hopp.env.global.delete([])`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft())
})
