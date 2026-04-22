import { describe, expect, test, vi } from "vitest"

vi.mock("~/modules/dioc", () => ({
  getService: vi.fn(() => ({
    currentActiveTab: {
      value: {
        document: { type: "example-response" },
      },
    },
  })),
}))

vi.mock("../../utils/environments", () => ({
  getCombinedEnvVariables: vi.fn(),
}))

import { getCombinedEnvVariables } from "../../utils/environments"
import {
  replaceTemplateString,
  replaceTemplateStringsInObjectValues,
} from "../index"

const mockedGetCombinedEnvVariables = vi.mocked(getCombinedEnvVariables)

describe("replaceTemplateString (OAuth2 env var resolution)", () => {
  test("uses currentValue when it is set", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [
        {
          key: "CLIENT_ID",
          secret: false,
          initialValue: "fallback-id",
          currentValue: "real-id",
        },
      ],
      global: [],
    })

    expect(replaceTemplateString("<<CLIENT_ID>>")).toBe("real-id")
  })

  test("falls back to initialValue when currentValue is empty", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [
        {
          key: "CLIENT_ID",
          secret: false,
          initialValue: "fallback-id",
          currentValue: "",
        },
      ],
      global: [],
    })

    expect(replaceTemplateString("<<CLIENT_ID>>")).toBe("fallback-id")
  })

  test("falls back to initialValue for secret variables too", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [
        {
          key: "CLIENT_SECRET",
          secret: true,
          initialValue: "fallback-secret",
          currentValue: "",
        },
      ],
      global: [],
    })

    expect(replaceTemplateString("<<CLIENT_SECRET>>")).toBe("fallback-secret")
  })

  test("resolves to empty string when both currentValue and initialValue are empty", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [
        {
          key: "MISSING",
          secret: false,
          initialValue: "",
          currentValue: "",
        },
      ],
      global: [],
    })

    expect(replaceTemplateString("<<MISSING>>")).toBe("")
  })

  test("global variables also honor the fallback", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [],
      global: [
        {
          key: "TOKEN_URL",
          secret: false,
          initialValue: "https://auth.example.com/token",
          currentValue: "",
        },
      ],
    })

    expect(replaceTemplateString("<<TOKEN_URL>>")).toBe(
      "https://auth.example.com/token"
    )
  })
})

describe("replaceTemplateStringsInObjectValues (OAuth2 params)", () => {
  test("applies the fallback across every string value in the object", () => {
    mockedGetCombinedEnvVariables.mockReturnValue({
      selected: [
        {
          key: "CLIENT_ID",
          secret: false,
          initialValue: "fallback-id",
          currentValue: "",
        },
        {
          key: "CLIENT_SECRET",
          secret: true,
          initialValue: "fallback-secret",
          currentValue: "",
        },
        {
          key: "SCOPE",
          secret: false,
          initialValue: "read",
          currentValue: "write",
        },
      ],
      global: [],
    })

    const result = replaceTemplateStringsInObjectValues({
      clientID: "<<CLIENT_ID>>",
      clientSecret: "<<CLIENT_SECRET>>",
      scope: "<<SCOPE>>",
      isPKCE: true,
    })

    expect(result).toEqual({
      clientID: "fallback-id",
      clientSecret: "fallback-secret",
      scope: "write",
      isPKCE: true,
    })
  })
})
