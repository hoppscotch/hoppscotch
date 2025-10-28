import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

// Hopp namespace enforces strict string typing (unlike PM namespace)

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "test",
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

describe("hopp.env.set undefined rejection", () => {
  test("hopp.env.set rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.set("key", undefined)`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.active.set rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.active.set("key", undefined)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.global.set rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.global.set("key", undefined)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.setInitial rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.setInitial("key", undefined)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.active.setInitial rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.active.setInitial("key", undefined)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.global.setInitial rejects undefined value", () => {
    return expect(
      execEnv(`hopp.env.global.setInitial("key", undefined)`, {
        selected: [],
        global: [],
      })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.set rejects null value", () => {
    return expect(
      execEnv(`hopp.env.set("key", null)`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.set rejects boolean value", () => {
    return expect(
      execEnv(`hopp.env.set("key", true)`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.set rejects object value", () => {
    return expect(
      execEnv(`hopp.env.set("key", {})`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.set rejects array value", () => {
    return expect(
      execEnv(`hopp.env.set("key", [])`, { selected: [], global: [] })()
    ).resolves.toBeLeft()
  })

  test("hopp.env.set accepts string value (baseline)", () => {
    return expect(
      execEnv(`hopp.env.set("key", "value")`, { selected: [], global: [] })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "key",
            currentValue: "value",
            initialValue: "value",
            secret: false,
          },
        ],
      })
    )
  })
})
