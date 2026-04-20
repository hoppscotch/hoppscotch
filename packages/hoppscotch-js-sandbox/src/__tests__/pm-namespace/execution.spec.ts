import { describe, expect, test } from "vitest"
import {
  runPreRequest,
  runPreRequestAndGetNextRequest,
  runTest,
  runTestAndGetNextRequest,
} from "~/utils/test-helpers"

describe("pm.execution namespace", () => {
  test("pm.execution.location returns Hoppscotch array in test script", () => {
    return expect(
      runTest(
        `
          pm.test("pm.execution.location is an array", () => {
            pm.expect(Array.isArray(pm.execution.location)).to.be.true
          })

          pm.test("pm.execution.location contains Hoppscotch", () => {
            pm.expect(pm.execution.location).to.include("Hoppscotch")
          })

          pm.test("pm.execution.location.current is Hoppscotch", () => {
            pm.expect(pm.execution.location.current).to.equal("Hoppscotch")
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
            descriptor: "pm.execution.location is an array",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
          expect.objectContaining({
            descriptor: "pm.execution.location contains Hoppscotch",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
          expect.objectContaining({
            descriptor: "pm.execution.location.current is Hoppscotch",
            expectResults: [{ status: "pass", message: expect.any(String) }],
          }),
        ],
      }),
    ])
  })

  test("pm.execution.location is accessible in pre-request script", () => {
    return expect(
      runPreRequest(
        `
          // Verify pm.execution.location exists and has expected values
          if (!Array.isArray(pm.execution.location)) {
            throw new Error("pm.execution.location is not an array")
          }
          if (!pm.execution.location.includes("Hoppscotch")) {
            throw new Error("pm.execution.location does not contain 'Hoppscotch'")
          }
          if (pm.execution.location.current !== "Hoppscotch") {
            throw new Error("pm.execution.location.current is not 'Hoppscotch'")
          }
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [],
        selected: [],
      })
    )
  })

  test("pm.execution.setNextRequest stores next request in pre-request script", () => {
    return expect(
      runPreRequestAndGetNextRequest(
        `pm.execution.setNextRequest("next-request")`,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight("next-request")
  })

  test("pm.setNextRequest alias stores next request in test script", () => {
    return expect(
      runTestAndGetNextRequest(`pm.setNextRequest("next-request")`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualRight("next-request")
  })

  test("pm.execution.setNextRequest accepts null to stop after current request", () => {
    return expect(
      runTestAndGetNextRequest(`pm.execution.setNextRequest(null)`, {
        global: [],
        selected: [],
      })()
    ).resolves.toEqualRight(null)
  })

  test("last setNextRequest call wins within a script", () => {
    return expect(
      runTestAndGetNextRequest(
        `
          pm.execution.setNextRequest("first-request")
          pm.setNextRequest("second-request")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight("second-request")
  })
})
