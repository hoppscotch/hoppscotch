import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse } from "~/types"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, res: TestResponse) =>
  pipe(
    runTestScript(script, { global: [], selected: [] }, res),
    TE.map((x) => x.tests)
  )

describe("runTestScript", () => {
  test("returns a resolved promise for a valid test script with all green", () => {
    return expect(
      func(
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
      func(
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
      func(
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
