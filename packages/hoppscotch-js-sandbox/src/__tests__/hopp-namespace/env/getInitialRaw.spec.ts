import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("hopp.env.getInitialRaw", () => {
  test("returns initial value for existing selected env variable", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("foo")
          hopp.expect(val).toBe("bar")
        `,
        {
          selected: [
            {
              key: "foo",
              currentValue: "baz",
              initialValue: "bar",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'bar' to be 'bar'" },
        ],
      }),
    ])
  })

  test("returns initial value from global if not in selected", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("foo")
          hopp.expect(val).toBe("bar")
        `,
        {
          selected: [],
          global: [
            {
              key: "foo",
              currentValue: "baz",
              initialValue: "bar",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'bar' to be 'bar'" },
        ],
      }),
    ])
  })

  test("selected shadows global when both present", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("foo")
          hopp.expect(val).toBe("selVal")
        `,
        {
          selected: [
            {
              key: "foo",
              currentValue: "selCur",
              initialValue: "selVal",
              secret: false,
            },
          ],
          global: [
            {
              key: "foo",
              currentValue: "globCur",
              initialValue: "globVal",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'selVal' to be 'selVal'" },
        ],
      }),
    ])
  })

  test("returns null for missing key", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("notFound")
          hopp.expect(val).toBe(null)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("returns empty string if initial value was empty", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("empty")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [
            { key: "empty", currentValue: "", initialValue: "", secret: false },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("returns literal template syntax, no resolution", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.getInitialRaw("templ")
          hopp.expect(val).toBe("<<FOO>>")
        `,
        {
          selected: [
            {
              key: "templ",
              currentValue: "baz",
              initialValue: "<<FOO>>",
              secret: false,
            },
            {
              key: "FOO",
              currentValue: "bar",
              initialValue: "bar",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<FOO>>' to be '<<FOO>>'" },
        ],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          hopp.env.getInitialRaw(5)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.active.getInitialRaw", () => {
  test("returns initial value if present in selected env", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.active.getInitialRaw("alpha")
          hopp.expect(val).toBe("a_value")
        `,
        {
          selected: [
            {
              key: "alpha",
              currentValue: "changed",
              initialValue: "a_value",
              secret: false,
            },
          ],
          global: [
            {
              key: "alpha",
              currentValue: "global",
              initialValue: "g_value",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'a_value' to be 'a_value'" },
        ],
      }),
    ])
  })

  test("returns null if not present in selected env", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.active.getInitialRaw("missing")
          hopp.expect(val).toBe(null)
        `,
        {
          selected: [],
          global: [
            {
              key: "missing",
              currentValue: "glob",
              initialValue: "g",
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

  test("returns '' if initial value was empty string", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.active.getInitialRaw("blank")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [
            { key: "blank", currentValue: "", initialValue: "", secret: false },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("returns literal template if present", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.active.getInitialRaw("tmpl")
          hopp.expect(val).toBe("<<BAR>>")
        `,
        {
          selected: [
            {
              key: "tmpl",
              currentValue: "baz",
              initialValue: "<<BAR>>",
              secret: false,
            },
            {
              key: "BAR",
              currentValue: "qux",
              initialValue: "qux",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<BAR>>' to be '<<BAR>>'" },
        ],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          hopp.env.active.getInitialRaw({})
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.global.getInitialRaw", () => {
  test("returns initial value if present in global env", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.global.getInitialRaw("gamma")
          hopp.expect(val).toBe("g_val")
        `,
        {
          selected: [
            {
              key: "gamma",
              currentValue: "s_val",
              initialValue: "s_val",
              secret: false,
            },
          ],
          global: [
            {
              key: "gamma",
              currentValue: "current",
              initialValue: "g_val",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'g_val' to be 'g_val'" },
        ],
      }),
    ])
  })

  test("returns null if not present in global env", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.global.getInitialRaw("none")
          hopp.expect(val).toBe(null)
        `,
        {
          selected: [
            {
              key: "none",
              currentValue: "s",
              initialValue: "s",
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

  test("returns '' if initial value was empty string", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.global.getInitialRaw("empty")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [
            { key: "empty", currentValue: "", initialValue: "", secret: false },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("returns literal template value if present", () => {
    return expect(
      runTest(
        `
          const val = hopp.env.global.getInitialRaw("tmpl")
          hopp.expect(val).toBe("<<ZED>>")
        `,
        {
          selected: [],
          global: [
            {
              key: "tmpl",
              currentValue: "zed-cur",
              initialValue: "<<ZED>>",
              secret: false,
            },
            {
              key: "ZED",
              currentValue: "42",
              initialValue: "42",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected '<<ZED>>' to be '<<ZED>>'" },
        ],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      runTest(
        `
          hopp.env.global.getInitialRaw([])
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})
