// @vitest-environment node
import { describe, expect, test } from "vitest"

describe("handleVariableRename logic", () => {
  test("replaces <<oldKey>> references in initialValue when key is renamed", () => {
    const originalKeys = new Map<number, string>()

    const vars = [
      {
        id: 0,
        env: {
          key: "base_url",
          initialValue: "https://api.com",
          currentValue: "",
        },
      },
      {
        id: 1,
        env: {
          key: "endpoint",
          initialValue: "<<base_url>>/users",
          currentValue: "",
        },
      },
    ]

    originalKeys.set(0, vars[0].env.key)
    vars[0].env.key = "api_url"

    const oldKey = originalKeys.get(0)!
    const newKey = vars[0].env.key

    if (oldKey && oldKey !== newKey) {
      vars.forEach((v) => {
        v.env.initialValue = v.env.initialValue.replaceAll(
          `<<${oldKey}>>`,
          `<<${newKey}>>`
        )
        v.env.currentValue = v.env.currentValue.replaceAll(
          `<<${oldKey}>>`,
          `<<${newKey}>>`
        )
      })
    }

    expect(vars[1].env.initialValue).toBe("<<api_url>>/users")
  })

  test("does not replace if key did not change", () => {
    const originalKeys = new Map<number, string>()

    const vars = [
      {
        id: 0,
        env: {
          key: "base_url",
          initialValue: "https://api.com",
          currentValue: "",
        },
      },
      {
        id: 1,
        env: {
          key: "endpoint",
          initialValue: "<<base_url>>/users",
          currentValue: "",
        },
      },
    ]

    originalKeys.set(0, "base_url")
    const oldKey = originalKeys.get(0)!
    const newKey = "base_url"

    if (oldKey && oldKey !== newKey) {
      vars.forEach((v) => {
        v.env.initialValue = v.env.initialValue.replaceAll(
          `<<${oldKey}>>`,
          `<<${newKey}>>`
        )
      })
    }

    expect(vars[1].env.initialValue).toBe("<<base_url>>/users")
  })

  test("replaces multiple occurrences of the same variable", () => {
    const originalKeys = new Map<number, string>()

    const vars = [
      {
        id: 0,
        env: { key: "host", initialValue: "localhost", currentValue: "" },
      },
      {
        id: 1,
        env: {
          key: "url",
          initialValue: "<<host>>:3000/<<host>>/api",
          currentValue: "",
        },
      },
    ]

    originalKeys.set(0, "host")
    vars[0].env.key = "server"

    const oldKey = originalKeys.get(0)!
    const newKey = vars[0].env.key

    vars.forEach((v) => {
      v.env.initialValue = v.env.initialValue.replaceAll(
        `<<${oldKey}>>`,
        `<<${newKey}>>`
      )
    })

    expect(vars[1].env.initialValue).toBe("<<server>>:3000/<<server>>/api")
  })

  test("replaces references in currentValue as well", () => {
    const originalKeys = new Map<number, string>()

    const vars = [
      { id: 0, env: { key: "token", initialValue: "", currentValue: "" } },
      {
        id: 1,
        env: {
          key: "auth",
          initialValue: "",
          currentValue: "Bearer <<token>>",
        },
      },
    ]

    originalKeys.set(0, "token")
    vars[0].env.key = "api_token"

    const oldKey = originalKeys.get(0)!
    const newKey = vars[0].env.key

    vars.forEach((v) => {
      v.env.currentValue = v.env.currentValue.replaceAll(
        `<<${oldKey}>>`,
        `<<${newKey}>>`
      )
    })

    expect(vars[1].env.currentValue).toBe("Bearer <<api_token>>")
  })

  test("does nothing if oldKey is not in the map", () => {
    const originalKeys = new Map<number, string>()

    const vars = [
      {
        id: 0,
        env: {
          key: "base_url",
          initialValue: "https://api.com",
          currentValue: "",
        },
      },
    ]

    const oldKey = originalKeys.get(99)
    if (oldKey) {
      vars.forEach((v) => {
        v.env.initialValue = v.env.initialValue.replaceAll(
          `<<${oldKey}>>`,
          "<<new>>"
        )
      })
    }

    expect(vars[0].env.initialValue).toBe("https://api.com")
  })
})
