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
    TE.map((x) => x.envs)
  )

const funcTest = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, envs, fakeResponse),
    TE.map((x) => x.tests)
  )

describe("pw.env.unset", () => {
  test("removes the variable set in selected environment correctly", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [],
          selected: [
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [],
      })
    )
  })

  test("removes the variable set in global environment correctly", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [],
      })
    )
  })

  test("removes the variable from selected environment if the entry is present in both selected and global environments", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              value: "https://httpbin.org",
              secret: false,
            },
          ],
          selected: [
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            value: "https://httpbin.org",
            secret: false,
          },
        ],
        selected: [],
      })
    )
  })

  test("removes the initial occurrence of an entry if duplicate entries exist in the selected environment", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
          selected: [
            {
              key: "baseUrl",
              value: "https://httpbin.org",
              secret: false,
            },
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            value: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [
          {
            key: "baseUrl",
            value: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })
    )
  })

  test("removes the initial occurrence of an entry if duplicate entries exist in the global environment", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              value: "https://httpbin.org/",
              secret: false,
            },
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "baseUrl",
            value: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [],
      })
    )
  })

  test("no change if attempting to delete non-existent keys", () => {
    return expect(
      func(
        `
          pw.env.unset("baseUrl")
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

  test("keys should be a string", () => {
    return expect(
      func(
        `
          pw.env.unset(5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("set environment values are reflected in the script execution", () => {
    return expect(
      funcTest(
        `
          pw.env.unset("baseUrl")
          pw.expect(pw.env.get("baseUrl")).toBe(undefined)
        `,
        {
          global: [],
          selected: [
            {
              key: "baseUrl",
              value: "https://echo.hoppscotch.io",
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
            message: "Expected 'undefined' to be 'undefined'",
          },
        ],
      }),
    ])
  })
})
