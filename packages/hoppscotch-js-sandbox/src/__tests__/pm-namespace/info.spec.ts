import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/node"
import { runTest, defaultRequest, fakeResponse } from "~/utils/test-helpers"
import { runPreRequestScript } from "~/web"

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

  test("pm.info.eventName returns 'test' in test context", () => {
    return expect(
      runTest(
        `
          pm.test("Event name is correct", () => {
            pm.expect(pm.info.eventName).toBe("test")
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
                message: "Expected 'test' to be 'test'",
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("pm.info provides requestName and requestId", () => {
    const customRequest = {
      ...defaultRequest,
      name: "default-request",
      id: "test-id",
    }

    return expect(
      runTest(
        `
          pm.test("Request info is available", () => {
            pm.expect(pm.info.requestName).toBe("default-request")
            pm.expect(pm.info.requestId).toBe("test-id")
          })
        `,
        {
          global: [],
          selected: [],
        },
        fakeResponse,
        customRequest
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

  test("pm.info.requestId falls back to requestName when id is undefined", () => {
    return expect(
      pipe(
        runTestScript(
          `
            pm.test("Request ID fallback works", () => {
              pm.expect(pm.info.requestId).to.exist
              pm.expect(pm.info.requestId).toBe("fallback-request-name")
            })
          `,
          {
            envs: { global: [], selected: [] },
            request: { ...defaultRequest, name: "fallback-request-name" },
            response: fakeResponse,
          }
        ),
        TE.map((x) => x.tests)
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "Request ID fallback works",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })
})
