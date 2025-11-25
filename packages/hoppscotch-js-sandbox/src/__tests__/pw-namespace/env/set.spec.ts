import { describe, expect, test } from "vitest"
import { runTestAndGetEnvs, runTest } from "~/utils/test-helpers"

describe("pw.env.set", () => {
  test("updates the selected environment variable correctly", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set("a", "c")
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
    ).resolves.toEqualRight(
      expect.objectContaining({
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "b",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates the global environment variable correctly", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set("a", "c")
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
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "b",
            secret: false,
          },
        ],
      })
    )
  })

  test("updates the selected environment if env present in both", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set("a", "c")
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
          selected: [
            {
              key: "a",
              currentValue: "d",
              initialValue: "d",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [
          {
            key: "a",
            currentValue: "b",
            initialValue: "b",
            secret: false,
          },
        ],
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "d",
            secret: false,
          },
        ],
      })
    )
  })

  test("non existent keys are created in the selected environment", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set("a", "c")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        global: [],
        selected: [
          {
            key: "a",
            currentValue: "c",
            initialValue: "c",
            secret: false,
          },
        ],
      })
    )
  })

  test("keys should be a string", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set(5, "c")
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("values should be a string", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set("a", 5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("both keys and values should be strings", () => {
    return expect(
      runTestAndGetEnvs(
        `
          pw.env.set(5, 5)
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
          pw.env.set("a", "b")
          pw.expect(pw.env.get("a")).toBe("b")
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
            message: "Expected 'b' to be 'b'",
          },
        ],
      }),
    ])
  })
})
