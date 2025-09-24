import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse, TestResult } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, envs: TestResult["envs"]) =>
  pipe(
    runTestScript(script, {
      envs,
      request: defaultRequest,
      response: fakeResponse,
    }),
    TE.map((x) => x.tests)
  )

describe("hopp.env.setInitial", () => {
  test("sets initial value in selected env when key doesn't exist", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("newKey", "newValue")
          const val = hopp.env.getInitialRaw("newKey")
          hopp.expect(val).toBe("newValue")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'newValue' to be 'newValue'" },
        ],
      }),
    ])
  })

  test("updates initial value in selected env when key exists", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("existing", "updated")
          const val = hopp.env.getInitialRaw("existing")
          hopp.expect(val).toBe("updated")
        `,
        {
          selected: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("updates selected env when key exists in both selected and global", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("shared", "selectedUpdate")
          const val = hopp.env.getInitialRaw("shared")
          hopp.expect(val).toBe("selectedUpdate")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "selInit",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globInit",
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
            message: "Expected 'selectedUpdate' to be 'selectedUpdate'",
          },
        ],
      }),
    ])
  })

  test("sets initial value in global env when only exists in global", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("globalOnly", "globalUpdate")
          const val = hopp.env.getInitialRaw("globalOnly")
          hopp.expect(val).toBe("globalUpdate")
        `,
        {
          selected: [],
          global: [
            {
              key: "globalOnly",
              currentValue: "current",
              initialValue: "original",
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
            message: "Expected 'globalUpdate' to be 'globalUpdate'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string as initial value", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("empty", "")
          const val = hopp.env.getInitialRaw("empty")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("allows setting template syntax as initial value", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("template", "<<FOO>>")
          const val = hopp.env.getInitialRaw("template")
          hopp.expect(val).toBe("<<FOO>>")
        `,
        {
          selected: [],
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
      func(
        `
          hopp.env.setInitial(123, "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      func(
        `
          hopp.env.setInitial("key", 456)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.active.setInitial", () => {
  test("sets initial value in selected env only", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial("activeKey", "activeValue")
          const activeVal = hopp.env.active.getInitialRaw("activeKey")
          const globalVal = hopp.env.global.getInitialRaw("activeKey")
          hopp.expect(activeVal).toBe("activeValue")
          hopp.expect(globalVal).toBe(null)
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'activeValue' to be 'activeValue'",
          },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("updates existing selected env variable", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial("existing", "updated")
          const val = hopp.env.active.getInitialRaw("existing")
          hopp.expect(val).toBe("updated")
        `,
        {
          selected: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("does not affect global env even if key exists there", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial("shared", "activeUpdate")
          const activeVal = hopp.env.active.getInitialRaw("shared")
          const globalVal = hopp.env.global.getInitialRaw("shared")
          hopp.expect(activeVal).toBe("activeUpdate")
          hopp.expect(globalVal).toBe("globalOriginal")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "selInit",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globalOriginal",
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
            message: "Expected 'activeUpdate' to be 'activeUpdate'",
          },
          {
            status: "pass",
            message: "Expected 'globalOriginal' to be 'globalOriginal'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial("blank", "")
          const val = hopp.env.active.getInitialRaw("blank")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("errors for non-string key", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial(null, "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      func(
        `
          hopp.env.active.setInitial("key", {})
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})

describe("hopp.env.global.setInitial", () => {
  test("sets initial value in global env only", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("globalKey", "globalValue")
          const globalVal = hopp.env.global.getInitialRaw("globalKey")
          const activeVal = hopp.env.active.getInitialRaw("globalKey")
          hopp.expect(globalVal).toBe("globalValue")
          hopp.expect(activeVal).toBe(null)
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          {
            status: "pass",
            message: "Expected 'globalValue' to be 'globalValue'",
          },
          { status: "pass", message: "Expected 'null' to be 'null'" },
        ],
      }),
    ])
  })

  test("updates existing global env variable", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("existing", "updated")
          const val = hopp.env.global.getInitialRaw("existing")
          hopp.expect(val).toBe("updated")
        `,
        {
          selected: [],
          global: [
            {
              key: "existing",
              currentValue: "current",
              initialValue: "original",
              secret: false,
            },
          ],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [
          { status: "pass", message: "Expected 'updated' to be 'updated'" },
        ],
      }),
    ])
  })

  test("does not affect selected env even if key exists there", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("shared", "globalUpdate")
          const globalVal = hopp.env.global.getInitialRaw("shared")
          const activeVal = hopp.env.active.getInitialRaw("shared")
          hopp.expect(globalVal).toBe("globalUpdate")
          hopp.expect(activeVal).toBe("activeOriginal")
        `,
        {
          selected: [
            {
              key: "shared",
              currentValue: "selCur",
              initialValue: "activeOriginal",
              secret: false,
            },
          ],
          global: [
            {
              key: "shared",
              currentValue: "globCur",
              initialValue: "globInit",
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
            message: "Expected 'globalUpdate' to be 'globalUpdate'",
          },
          {
            status: "pass",
            message: "Expected 'activeOriginal' to be 'activeOriginal'",
          },
        ],
      }),
    ])
  })

  test("allows setting empty string", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("empty", "")
          const val = hopp.env.global.getInitialRaw("empty")
          hopp.expect(val).toBe("")
        `,
        {
          selected: [],
          global: [],
        }
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        expectResults: [{ status: "pass", message: "Expected '' to be ''" }],
      }),
    ])
  })

  test("allows setting template syntax", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("template", "<<BAR>>")
          const val = hopp.env.global.getInitialRaw("template")
          hopp.expect(val).toBe("<<BAR>>")
        `,
        {
          selected: [],
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
      func(
        `
          hopp.env.global.setInitial([], "value")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })

  test("errors for non-string value", () => {
    return expect(
      func(
        `
          hopp.env.global.setInitial("key", true)
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toBeLeft()
  })
})
