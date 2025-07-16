import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests)
  )

describe("pw.env.get", () => {
  test("returns the correct value for an existing selected environment value", () => {
    return expect(
      func(
        `
          const data = pw.env.get("a")
          pw.expect(data).toBe("b")
      `,
        {
          global: [],
          selected: [
            {
              key: "a",
              currentValue: "b",
              initialValue: "b",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'b' to be 'b'",
          },
        ],
      }),
    ])
  })

  test("returns the correct value for an existing global environment value", () => {
    return expect(
      func(
        `
          const data = pw.env.get("a")
          pw.expect(data).toBe("b")
      `,
        {
          global: [
            {
              key: "a",
              currentValue: "b",
              initialValue: "b",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'b' to be 'b'",
          },
        ],
      }),
    ])
  })

  test("returns undefined for a key that is not present in both selected or environment", () => {
    return expect(
      func(
        `
          const data = pw.env.get("a")
          pw.expect(data).toBe(undefined)
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })

  test("returns the value defined in selected environment if it is also present in global", () => {
    return expect(
      func(
        `
          const data = pw.env.get("a")
          pw.expect(data).toBe("selected val")
      `,
        {
          global: [
            {
              key: "a",
              currentValue: "global val",
              initialValue: "global val",
              secret: false,
            },
          ],
          selected: [
            {
              key: "a",
              currentValue: "selected val",
              initialValue: "selected val",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'selected val' to be 'selected val'",
          },
        ],
      }),
    ])
  })

  test("does not resolve environment values", () => {
    return expect(
      func(
        `
          const data = pw.env.get("a")
          pw.expect(data).toBe("<<hello>>")
      `,
        {
          global: [],
          selected: [
            {
              key: "a",
              currentValue: "<<hello>>",
              initialValue: "<<hello>>",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected '<<hello>>' to be '<<hello>>'",
          },
        ],
      }),
    ])
  })

  test("errors if the key is not a string", () => {
    return expect(
      func(
        `
          const data = pw.env.get(5)
      `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })
})
