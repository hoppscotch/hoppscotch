import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pw.env.resolve", () => {
  test("value should be a string", () => {
    return expect(
      runTest(
        `
          pw.env.resolve(5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("resolves global variables correctly", () => {
    return expect(
      runTest(
        `
          const data = pw.env.resolve("<<hello>>")
          pw.expect(data).toBe("there")
        `,
        {
          global: [
            {
              key: "hello",
              initialValue: "there",
              currentValue: "there",
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
            message: "Expected 'there' to be 'there'",
          },
        ],
      }),
    ])
  })

  test("resolves selected env variables correctly", () => {
    return expect(
      runTest(
        `
          const data = pw.env.resolve("<<hello>>")
          pw.expect(data).toBe("there")
        `,
        {
          global: [],
          selected: [
            {
              key: "hello",
              initialValue: "there",
              currentValue: "there",
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
            message: "Expected 'there' to be 'there'",
          },
        ],
      }),
    ])
  })

  test("chooses selected env variable over global variables when both have same variable", () => {
    return expect(
      runTest(
        `
          const data = pw.env.resolve("<<hello>>")
          pw.expect(data).toBe("there")
        `,
        {
          global: [
            {
              key: "hello",
              initialValue: "yo",
              currentValue: "yo",
              secret: false,
            },
          ],
          selected: [
            {
              key: "hello",
              initialValue: "there",
              currentValue: "there",
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
            message: "Expected 'there' to be 'there'",
          },
        ],
      }),
    ])
  })

  test("if infinite loop in resolution, abandons resolutions altogether", () => {
    return expect(
      runTest(
        `
          const data = pw.env.resolve("<<hello>>")
          pw.expect(data).toBe("<<hello>>")
        `,
        {
          global: [],
          selected: [
            {
              key: "hello",
              currentValue: "<<there>>",
              initialValue: "<<there>>",
              secret: false,
            },
            {
              key: "there",
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
})
