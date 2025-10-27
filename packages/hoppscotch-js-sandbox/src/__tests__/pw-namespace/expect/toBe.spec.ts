import { describe, expect, test } from "vitest"
import { runTest, fakeResponse } from "~/utils/test-helpers"

describe("toBe", () => {
  describe("general assertion (no negation)", () => {
    test("expect equals expected passes assertion", () => {
      return expect(
        runTest(
          `
            pw.expect(2).toBe(2)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected '2' to be '2'" },
          ],
        }),
      ])
    })

    test("expect not equals expected fails assertion", () => {
      return expect(
        runTest(
          `
              pw.expect(2).toBe(4)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "fail", message: "Expected '2' to be '4'" },
          ],
        }),
      ])
    })
  })

  describe("general assertion (with negation)", () => {
    test("expect equals expected fails assertion", () => {
      return expect(
        runTest(
          `
            pw.expect(2).not.toBe(2)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "fail",
              message: "Expected '2' to not be '2'",
            },
          ],
        }),
      ])
    })

    test("expect not equals expected passes assertion", () => {
      return expect(
        runTest(
          `
              pw.expect(2).not.toBe(4)
          `,
          fakeResponse
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '2' to not be '4'",
            },
          ],
        }),
      ])
    })
  })
})

test("strict checks types", () => {
  return expect(
    runTest(
      `
          pw.expect(2).toBe("2")
        `,
      fakeResponse
    )()
  ).resolves.toEqualRight([
    expect.objectContaining({
      expectResults: [
        {
          status: "fail",
          message: "Expected '2' to be '2'",
        },
      ],
    }),
  ])
})
