import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("hopp.env.getRaw", () => {
  test("returns the correct value for an existing selected environment value", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe("b")
        `,
        {
          global: [],
          selected: [
            { key: "a", currentValue: "b", initialValue: "b", secret: false },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'b' to be 'b'" }],
      }),
    ])
  })

  test("returns the correct value for an existing global environment value", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe("b")
        `,
        {
          global: [
            { key: "a", currentValue: "b", initialValue: "b", secret: false },
          ],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected 'b' to be 'b'" }],
      }),
    ])
  })

  test("returns null for a key that is not present in both selected and global", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe(null)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("returns the value defined in selected if also present in global", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe("selected val")
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

  test("does not resolve values recursively", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe("<<hello>>")
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
            {
              key: "hello",
              currentValue: "there",
              initialValue: "there",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<hello>>' to be '<<hello>>'" },
        ],
      }),
    ])
  })

  test("returns the value as is even if there is a potential recursion", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw("a")
          hopp.expect(data).toBe("<<hello>>")
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
            {
              key: "hello",
              currentValue: "<<a>>",
              initialValue: "<<a>>",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<hello>>' to be '<<hello>>'" },
        ],
      }),
    ])
  })

  test("errors if the key is not a string", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.getRaw(5)
        `,
        { global: [], selected: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.active.getRaw", () => {
  test("returns only from selected", () => {
    return expect(
      runTest(
        `
          hopp.expect(hopp.env.active.getRaw("a")).toBe("a-selected")
          hopp.expect(hopp.env.active.getRaw("b")).toBe(null)
        `,
        {
          selected: [
            {
              key: "a",
              currentValue: "a-selected",
              initialValue: "AS",
              secret: false,
            },
          ],
          global: [
            {
              key: "a",
              currentValue: "a-global",
              initialValue: "AG",
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
            message: "Expected 'a-selected' to be 'a-selected'",
          },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("returns null if key absent in selected", () => {
    return expect(
      runTest(
        `
          hopp.expect(hopp.env.active.getRaw("missing")).toBe(null)
        `,
        {
          selected: [],
          global: [
            {
              key: "missing",
              currentValue: "global",
              initialValue: "global",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("errors if key is not a string", () => {
    return expect(
      runTest(
        `
          hopp.env.active.getRaw({})
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.global.getRaw", () => {
  test("returns only from global", () => {
    return expect(
      runTest(
        `
          hopp.expect(hopp.env.global.getRaw("b")).toBe("b-global")
          hopp.expect(hopp.env.global.getRaw("a")).toBe(null)
        `,
        {
          selected: [
            {
              key: "a",
              currentValue: "a-selected",
              initialValue: "AS",
              secret: false,
            },
          ],
          global: [
            {
              key: "b",
              currentValue: "b-global",
              initialValue: "BG",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'b-global' to be 'b-global'" },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("returns null if key absent in global", () => {
    return expect(
      runTest(
        `
          hopp.expect(hopp.env.global.getRaw("missing")).toBe(null)
        `,
        {
          selected: [
            {
              key: "missing",
              currentValue: "sel",
              initialValue: "sel",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("errors if key is not a string", () => {
    return expect(
      runTest(
        `
          hopp.env.global.getRaw([])
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})
