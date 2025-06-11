import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { describe, expect, test } from "vitest"

import { runPreRequestScript, runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

describe("Base64 helper functions", () => {
  const scriptExpectations = {
    atob: {
      script: `pw.env.set("atob", atob("SGVsbG8gV29ybGQ="))`,
      environment: {
        selected: [
          {
            key: "atob",
            currentValue: "Hello World",
            initialValue: "Hello World",
            secret: false,
          },
        ],
      },
    },
    btoa: {
      script: `pw.env.set("btoa", btoa("Hello World"))`,
      environment: {
        selected: [
          {
            key: "btoa",
            currentValue: "SGVsbG8gV29ybGQ=",
            initialValue: "SGVsbG8gV29ybGQ=",
            secret: false,
          },
        ],
      },
    },
  }

  describe("Pre-request script", () => {
    describe("atob", () => {
      test("successfully decodes the input string", () => {
        return expect(
          runPreRequestScript(scriptExpectations.atob.script, {
            global: [],
            selected: [],
          })()
        ).resolves.toEqualRight(
          expect.objectContaining(scriptExpectations.atob.environment)
        )
      })
    })

    describe("btoa", () => {
      test("successfully encodes the input string", () => {
        return expect(
          runPreRequestScript(scriptExpectations.btoa.script, {
            global: [],
            selected: [],
          })()
        ).resolves.toEqualRight(
          expect.objectContaining(scriptExpectations.btoa.environment)
        )
      })
    })
  })

  describe("Test script", () => {
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

    describe("atob", () => {
      test("successfully decodes the input string", () => {
        return expect(
          func(scriptExpectations.atob.script, { global: [], selected: [] })()
        ).resolves.toEqualRight(
          expect.objectContaining(scriptExpectations.atob.environment)
        )
      })
    })

    describe("btoa", () => {
      test("successfully encodes the input string", () => {
        return expect(
          func(scriptExpectations.btoa.script, { global: [], selected: [] })()
        ).resolves.toEqualRight(
          expect.objectContaining(scriptExpectations.btoa.environment)
        )
      })
    })
  })
})
