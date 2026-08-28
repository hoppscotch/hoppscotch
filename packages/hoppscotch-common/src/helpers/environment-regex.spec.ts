import { describe, expect, it } from "vitest"
import {
  HOPP_ENVIRONMENT_REGEX,
  HOPP_ENVIRONMENT_TEST_REGEX,
} from "./environment-regex"

describe("HOPP_ENVIRONMENT_TEST_REGEX", () => {
  it("returns a stable result across repeated `.test()` calls", () => {
    // A global regex keeps `lastIndex` between `.test()` calls, so this would
    // otherwise alternate true/false. The containment regex must not.
    for (let i = 0; i < 5; i++) {
      expect(HOPP_ENVIRONMENT_TEST_REGEX.test("<<token>>")).toBe(true)
    }
  })

  it("does not leak `lastIndex` state between strings of different lengths", () => {
    // Testing a longer match first, then a shorter string that also contains a
    // variable, must still report the shorter one as containing a variable.
    expect(HOPP_ENVIRONMENT_TEST_REGEX.test("https://<<host>>/api")).toBe(true)
    expect(HOPP_ENVIRONMENT_TEST_REGEX.test("<<url>>")).toBe(true)
  })

  it("returns false for strings without a variable", () => {
    expect(HOPP_ENVIRONMENT_TEST_REGEX.test("https://example.com")).toBe(false)
    expect(HOPP_ENVIRONMENT_TEST_REGEX.test("<<not closed")).toBe(false)
  })
})

describe("HOPP_ENVIRONMENT_REGEX", () => {
  it("stays global so `String.match` can extract every occurrence", () => {
    expect(HOPP_ENVIRONMENT_REGEX.flags).toContain("g")
    expect("<<a>> and <<b>>".match(HOPP_ENVIRONMENT_REGEX)).toEqual([
      "<<a>>",
      "<<b>>",
    ])
  })
})
