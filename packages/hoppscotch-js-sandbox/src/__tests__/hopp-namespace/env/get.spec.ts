import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("hopp.env.get", () => {
  test("returns the correct value for an existing selected environment value", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get("a")
          hopp.expect(data).toBe("b")
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
        expectResults: [{ status: "pass", message: "Expected 'b' to be 'b'" }],
      }),
    ])
  })

  test("returns the correct value for an existing global environment value", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get("a")
          hopp.expect(data).toBe("b")
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
        expectResults: [{ status: "pass", message: "Expected 'b' to be 'b'" }],
      }),
    ])
  })

  test("returns null for a key that is not present in both selected or global", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get("a")
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

  test("returns the value defined in selected environment if also present in global", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get("a")
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

  test("resolves environment values recursively by default", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get("a")
          hopp.expect(data).toBe("hello")
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
              currentValue: "hello",
              initialValue: "hello",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'hello' to be 'hello'" },
        ],
      }),
    ])
  })

  test("errors if the key is not a string", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.get(5)
        `,
        {
          global: [],
          selected: [],
        }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.active.get", () => {
  test("returns the value from selected environment if present", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.active.get("a")
          hopp.expect(data).toBe("selectedVal")
        `,
        {
          selected: [
            {
              key: "a",
              currentValue: "selectedVal",
              initialValue: "selectedVal",
              secret: false,
            },
          ],
          global: [
            {
              key: "a",
              currentValue: "globalVal",
              initialValue: "globalVal",
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
            message: "Expected 'selectedVal' to be 'selectedVal'",
          },
        ],
      }),
    ])
  })

  test("returns null if key does not exist in selected", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.active.get("absent")
          hopp.expect(data).toBe(null)
        `,
        {
          selected: [],
          global: [
            {
              key: "absent",
              currentValue: "globalVal",
              initialValue: "globalVal",
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

  test("errors if the key is not a string", () => {
    return expect(
      runTest(
        `
          hopp.env.active.get({})
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.global.get", () => {
  test("returns the value from global environment if present", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.global.get("foo")
          hopp.expect(data).toBe("globalVal")
        `,
        {
          selected: [
            {
              key: "foo",
              currentValue: "selVal",
              initialValue: "selVal",
              secret: false,
            },
          ],
          global: [
            {
              key: "foo",
              currentValue: "globalVal",
              initialValue: "globalVal",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'globalVal' to be 'globalVal'" },
        ],
      }),
    ])
  })

  test("returns null if key does not exist in global", () => {
    return expect(
      runTest(
        `
          const data = hopp.env.global.get("not_here")
          hopp.expect(data).toBe(null)
        `,
        {
          selected: [
            {
              key: "not_here",
              currentValue: "selVal",
              initialValue: "selVal",
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

  test("errors if the key is not a string", () => {
    return expect(
      runTest(
        `
          hopp.env.global.get([])
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})
