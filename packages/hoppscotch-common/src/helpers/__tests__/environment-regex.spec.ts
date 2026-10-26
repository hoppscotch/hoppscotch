import { describe, expect, it } from "vitest"

import { HOPP_ENVIRONMENT_REGEX } from "../environment-regex"

describe("HOPP_ENVIRONMENT_REGEX", () => {
  it("reports the same result for repeated checks of the same string", () => {
    const url = "https://api.hoppscotch.io/v1/users?token=<<accessToken>>"

    expect(HOPP_ENVIRONMENT_REGEX.test(url)).toBe(true)
    expect(HOPP_ENVIRONMENT_REGEX.test(url)).toBe(true)
    expect(HOPP_ENVIRONMENT_REGEX.test(url)).toBe(true)
  })

  it("finds env vars wherever they appear in the string", () => {
    expect(HOPP_ENVIRONMENT_REGEX.test("<<token>>")).toBe(true)
    expect(HOPP_ENVIRONMENT_REGEX.test("Bearer <<token>>")).toBe(true)
    expect(HOPP_ENVIRONMENT_REGEX.test("<<a>> and <<b>>")).toBe(true)
  })

  it("reports the same result for repeated checks of a string without env vars", () => {
    const url = "https://api.hoppscotch.io/v1/users"

    expect(HOPP_ENVIRONMENT_REGEX.test(url)).toBe(false)
    expect(HOPP_ENVIRONMENT_REGEX.test(url)).toBe(false)
  })

  it("has a global counterpart that matches every env var in a string", async () => {
    const { HOPP_ENVIRONMENT_REGEX_GLOBAL } = await import(
      "../environment-regex"
    )

    expect("<<a>> and <<b>>".match(HOPP_ENVIRONMENT_REGEX_GLOBAL)).toEqual([
      "<<a>>",
      "<<b>>",
    ])
  })
})
