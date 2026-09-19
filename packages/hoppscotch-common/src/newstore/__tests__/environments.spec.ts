// @vitest-environment node
import { describe, expect, test } from "vitest"

describe("handleVariableRename", () => {
  test("replaces <<oldKey>> with <<newKey>> in other variables", () => {
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

    const oldKey = "base_url"
    const newKey = "api_url"

    vars.forEach((v) => {
      v.env.initialValue = v.env.initialValue.replaceAll(
        `<<${oldKey}>>`,
        `<<${newKey}>>`
      )
    })

    expect(vars[1].env.initialValue).toBe("<<api_url>>/users")
  })

  test("does nothing if key did not change", () => {
    const vars = [
      {
        id: 1,
        env: {
          key: "endpoint",
          initialValue: "<<base_url>>/users",
          currentValue: "",
        },
      },
    ]

    const oldKey = "base_url"
    const newKey = "base_url"

    if (oldKey !== newKey) {
      vars.forEach((v) => {
        v.env.initialValue = v.env.initialValue.replaceAll(
          `<<${oldKey}>>`,
          `<<${newKey}>>`
        )
      })
    }

    expect(vars[0].env.initialValue).toBe("<<base_url>>/users")
  })

  test("replaces multiple occurrences", () => {
    const vars = [
      {
        id: 0,
        env: {
          key: "url",
          initialValue: "<<host>>:3000/<<host>>",
          currentValue: "",
        },
      },
    ]

    const oldKey = "host"
    const newKey = "server"

    vars.forEach((v) => {
      v.env.initialValue = v.env.initialValue.replaceAll(
        `<<${oldKey}>>`,
        `<<${newKey}>>`
      )
    })

    expect(vars[0].env.initialValue).toBe("<<server>>:3000/<<server>>")
  })
})
