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

const execEnv = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.envs)
  )

const execTest = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("hopp.env.set", () => {
  test("updates the selected environment variable correctly", () => {
    return expect(
      execEnv(`hopp.env.set("a", "c")`, {
        global: [],
        selected: [
          { key: "a", currentValue: "b", initialValue: "b", secret: false },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          { key: "a", currentValue: "c", initialValue: "b", secret: false },
        ],
      })
    )
  })

  test("updates the global environment variable correctly", () => {
    return expect(
      execEnv(`hopp.env.set("a", "c")`, {
        global: [
          { key: "a", currentValue: "b", initialValue: "b", secret: false },
        ],
        selected: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          { key: "a", currentValue: "c", initialValue: "b", secret: false },
        ],
      })
    )
  })

  test("if env exists in both, updates only selected", () => {
    return expect(
      execEnv(`hopp.env.set("a", "selC")`, {
        global: [
          {
            key: "a",
            currentValue: "globB",
            initialValue: "globB",
            secret: false,
          },
        ],
        selected: [
          {
            key: "a",
            currentValue: "selD",
            initialValue: "selD",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            currentValue: "globB",
            initialValue: "globB",
            secret: false,
          },
        ],
        selected: [
          {
            key: "a",
            currentValue: "selC",
            initialValue: "selD",
            secret: false,
          },
        ],
      })
    )
  })

  test("creates non-existent key in selected environment", () => {
    return expect(
      execEnv(`hopp.env.set("a", "created")`, { global: [], selected: [] })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "a",
            currentValue: "created",
            initialValue: "created",
            secret: false,
          },
        ],
        global: [],
      })
    )
  })

  test("does not affect secret status for existing variable", () => {
    return expect(
      execEnv(`hopp.env.set("mysecret", "not-secret-anymore")`, {
        selected: [
          {
            key: "mysecret",
            currentValue: "secretvalue",
            initialValue: "secretvalue",
            secret: true,
          },
        ],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "mysecret",
            currentValue: "not-secret-anymore",
            initialValue: "secretvalue",
            secret: true,
          },
        ],
      })
    )
  })

  test("rejects non-string key", () => {
    return expect(
      execEnv(`hopp.env.set(7, "foo")`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("rejects non-string value", () => {
    return expect(
      execEnv(`hopp.env.set("key", 123)`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("both key and value must be strings", () => {
    return expect(
      execEnv(`hopp.env.set(5, 6)`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("set environment values are reflected immediately", () => {
    return expect(
      execTest(
        `
          hopp.env.set("foo", "bar")
          hopp.expect(hopp.env.get("foo")).toBe("bar")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'bar' to be 'bar'" },
        ],
      }),
    ])
  })
})

describe("hopp.env.active.set", () => {
  test("sets in selected even if key exists in global", () => {
    return expect(
      execEnv(`hopp.env.active.set("b", "in-selected")`, {
        selected: [],
        global: [
          {
            key: "b",
            currentValue: "in-global",
            initialValue: "in-global",
            secret: false,
          },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "b",
            currentValue: "in-selected",
            initialValue: "in-selected",
            secret: false,
          },
        ],
        global: [
          {
            key: "b",
            currentValue: "in-global",
            initialValue: "in-global",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates existing selected variable", () => {
    return expect(
      execEnv(`hopp.env.active.set("foo", "bar")`, {
        selected: [
          {
            key: "foo",
            currentValue: "baz",
            initialValue: "baz",
            secret: false,
          },
        ],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "baz",
            secret: false,
          },
        ],
      })
    )
  })

  test("creates a new key in selected", () => {
    return expect(
      execEnv(`hopp.env.active.set("make", "new")`, {
        selected: [],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "make",
            currentValue: "new",
            initialValue: "new",
            secret: false,
          },
        ],
        global: [],
      })
    )
  })

  test("rejects non-string key", () => {
    return expect(
      execEnv(`hopp.env.active.set(null, "value")`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("rejects non-string value", () => {
    return expect(
      execEnv(`hopp.env.active.set("key", {})`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.global.set", () => {
  test("creates in global, does not affect selected", () => {
    return expect(
      execEnv(`hopp.env.global.set("c", "in-global")`, {
        selected: [
          {
            key: "c",
            currentValue: "selected",
            initialValue: "selected",
            secret: false,
          },
        ],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "c",
            currentValue: "selected",
            initialValue: "selected",
            secret: false,
          },
        ],
        global: [
          {
            key: "c",
            currentValue: "in-global",
            initialValue: "in-global",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates existing global variable", () => {
    return expect(
      execEnv(`hopp.env.global.set("d", "updated")`, {
        selected: [],
        global: [
          { key: "d", currentValue: "old", initialValue: "old", secret: false },
        ],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "d",
            currentValue: "updated",
            initialValue: "old",
            secret: false,
          },
        ],
      })
    )
  })

  test("creates new variable in global", () => {
    return expect(
      execEnv(`hopp.env.global.set("e", "new-value")`, {
        selected: [],
        global: [],
      })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [],
        global: [
          {
            key: "e",
            currentValue: "new-value",
            initialValue: "new-value",
            secret: false,
          },
        ],
      })
    )
  })

  test("rejects non-string key", () => {
    return expect(
      execEnv(`hopp.env.global.set([], "foo")`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("rejects non-string value", () => {
    return expect(
      execEnv(`hopp.env.global.set("key", true)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })
})
