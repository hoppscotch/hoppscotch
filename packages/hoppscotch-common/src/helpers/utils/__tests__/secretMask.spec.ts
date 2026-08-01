import { describe, expect, test } from "vitest"
import { maskSecretValue } from "../secretMask"

describe("maskSecretValue", () => {
  test("masks each character with a single '*', preserving length", () => {
    expect(maskSecretValue("abc")).toBe("***")
    expect(maskSecretValue("super-secret-123")).toBe("*".repeat(16))
  })

  test("returns an empty string for an empty value (so unset stays distinguishable)", () => {
    expect(maskSecretValue("")).toBe("")
  })

  test("treats null/undefined as empty rather than masking", () => {
    expect(maskSecretValue(null)).toBe("")
    expect(maskSecretValue(undefined)).toBe("")
    expect(maskSecretValue()).toBe("")
  })
})
