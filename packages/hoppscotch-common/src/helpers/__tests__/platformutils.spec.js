import { vi, beforeEach, describe, expect, test } from "vitest"
import { getPlatformSpecialKey } from "../platformutils"

describe("getPlatformSpecialKey", () => {
  let platformGetter

  beforeEach(() => {
    platformGetter = vi.spyOn(navigator, "platform", "get")
  })

  test("returns '⌘' for Apple platforms", () => {
    platformGetter.mockReturnValue("Mac")
    expect(getPlatformSpecialKey()).toMatch("⌘")

    platformGetter.mockReturnValue("iPhone")
    expect(getPlatformSpecialKey()).toMatch("⌘")

    platformGetter.mockReturnValue("iPad")
    expect(getPlatformSpecialKey()).toMatch("⌘")

    platformGetter.mockReturnValue("iPod")
    expect(getPlatformSpecialKey()).toMatch("⌘")
  })

  test("return 'Ctrl' for non-Apple platforms", () => {
    platformGetter.mockReturnValue("Android")
    expect(getPlatformSpecialKey()).toMatch("Ctrl")

    platformGetter.mockReturnValue("Windows")
    expect(getPlatformSpecialKey()).toMatch("Ctrl")

    platformGetter.mockReturnValue("Linux")
    expect(getPlatformSpecialKey()).toMatch("Ctrl")
  })

  test("returns 'Ctrl' for null/undefined platforms", () => {
    platformGetter.mockReturnValue(null)
    expect(getPlatformSpecialKey()).toMatch("Ctrl")

    platformGetter.mockReturnValue(undefined)
    expect(getPlatformSpecialKey()).toMatch("Ctrl")
  })
})
