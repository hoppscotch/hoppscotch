import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"
import { runPreRequestScript } from "~/web"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "test response",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: { ...defaultRequest, name: "default-request", id: "test-id" },
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("pm.info context", () => {
  test("pm.info.eventName returns 'pre-request' in pre-request context", () => {
    const defaultRequest = getDefaultRESTRequest()

    return expect(
      runPreRequestScript(
        `
          console.log("Event name: ", pm.info.eventName)
        `,
        {
          envs: {
            global: [],
            selected: [],
          },
          request: defaultRequest,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({ args: ["Event name: ", "pre-request"] }),
        ],
      })
    )
  })

  test("pm.info.eventName returns 'post-request' in post-request context", () => {
    return expect(
      func(
        `
          pm.test("Event name is correct", () => {
            pm.expect(pm.info.eventName).toBe("post-request")
          })
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Event name is correct",
            expectResults: [
              {
                status: "pass",
                message: "Expected 'post-request' to be 'post-request'",
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("pm.info provides requestName and requestId", () => {
    return expect(
      func(
        `
          pm.test("Request info is available", () => {
            pm.expect(pm.info.requestName).toBe("default-request")
            pm.expect(pm.info.requestId).toBe("test-id")
          })
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Request info is available",
            expectResults: [
              {
                status: "pass",
                message: "Expected 'default-request' to be 'default-request'",
              },
              { status: "pass", message: "Expected 'test-id' to be 'test-id'" },
            ],
          }),
        ],
      }),
    ])
  })
})
