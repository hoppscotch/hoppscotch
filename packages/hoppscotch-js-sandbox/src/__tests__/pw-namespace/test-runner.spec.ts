import { describe, expect, test } from "vitest"
import { runTest, fakeResponse } from "~/utils/test-helpers"

describe("runTestScript", () => {
  test("returns a resolved promise for a valid test script with all green", () => {
    return expect(
      runTest(
        `
          pw.test("Arithmetic operations", () => {
            const size = 500 + 500;
            pw.expect(size).toBe(1000);
            pw.expect(size - 500).toBe(500);
            pw.expect(size * 4).toBe(4000);
            pw.expect(size / 4).toBe(250);
          });
        `,
        fakeResponse
      )()
    ).resolves.toBeRight()
  })

  test("resolves for tests with failed expectations", () => {
    return expect(
      runTest(
        `
          pw.test("Arithmetic operations", () => {
            const size = 500 + 500;
            pw.expect(size).toBe(1000);
            pw.expect(size - 500).not.toBe(500);
            pw.expect(size * 4).toBe(4000);
            pw.expect(size / 4).not.toBe(250);
          });
        `,
        fakeResponse
      )()
    ).resolves.toBeRight()
  })

  // TODO: We need a more concrete behavior for this
  test("rejects for invalid syntax on tests", () => {
    return expect(
      runTest(
        `
          pw.test("Arithmetic operations", () => {
            const size = 500 + 500;
            pw.expect(size).
            pw.expect(size - 500).not.toBe(500);
            pw.expect(size * 4).toBe(4000);
            pw.expect(size / 4).not.toBe(250);
          });
        `,
        fakeResponse
      )()
    ).resolves.toBeLeft()
  })
})
