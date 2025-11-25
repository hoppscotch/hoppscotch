import { describe, expect, test } from "vitest"
import { runTestAndGetEnvs, runTest } from "~/utils/test-helpers"

describe("pw.env.unset", () => {
  test("removes the variable set in selected environment correctly", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [],
          selected: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
      runTestAndGetEnvs(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
      runTestAndGetEnvs(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              currentValue: "https://httpbin.org",
              initialValue: "https://httpbin.org",
              secret: false,
            },
          ],
          selected: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
            currentValue: "https://httpbin.org",
            initialValue: "https://httpbin.org",
            secret: false,
          },
        ],
        selected: [],
      })
    )
  })

  test("removes the initial occurrence of an entry if duplicate entries exist in the selected environment", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
              secret: false,
            },
          ],
          selected: [
            {
              key: "baseUrl",
              currentValue: "https://httpbin.org",
              initialValue: "https://httpbin.org",
              secret: false,
            },
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
      })
    )
  })

  test("removes the initial occurrence of an entry if duplicate entries exist in the global environment", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.unset("baseUrl")
        `,
        {
          global: [
            {
              key: "baseUrl",
              currentValue: "https://httpbin.org",
              initialValue: "https://httpbin.org",
              secret: false,
            },
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
            currentValue: "https://echo.hoppscotch.io",
            initialValue: "https://echo.hoppscotch.io",
            secret: false,
          },
        ],
        selected: [],
      })
    )
  })

  test("no change if attempting to delete non-existent keys", () => {
    return expect(
      runTestAndGetEnvs(
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
      runTestAndGetEnvs(
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
      runTest(
        `
          pw.env.unset("baseUrl")
          pw.expect(pw.env.get("baseUrl")).toBe(undefined)
        `,
        {
          global: [],
          selected: [
            {
              key: "baseUrl",
              currentValue: "https://echo.hoppscotch.io",
              initialValue: "https://echo.hoppscotch.io",
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
