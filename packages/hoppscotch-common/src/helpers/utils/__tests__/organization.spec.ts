import { describe, test, expect } from "vitest"

import {
  getOrgInitials,
  getOrgColorIndex,
  getOrgColor,
  ORG_AVATAR_COLORS,
  sanitizeLogoUrl,
} from "../organization"

// pulls 1-2 uppercase initials from an org name for the avatar circle.
// the api can send back all sorts of garbage here (empty strings, extra whitespace,
// unicode names, etc.) so we gotta make sure we always spit out something the
// avatar component can actually render without blowing up.
describe("getOrgInitials", () => {
  test("single word gives one letter", () => {
    expect(getOrgInitials("Acme")).toBe("A")
  })

  test("two words gives two initials", () => {
    expect(getOrgInitials("Acme Corp")).toBe("AC")
  })

  test("three+ words still caps at two initials", () => {
    expect(getOrgInitials("My Cool Organization")).toBe("MC")
  })

  test("empty string falls back to question mark", () => {
    expect(getOrgInitials("")).toBe("?")
  })

  test("whitespace-only also falls back to question mark", () => {
    expect(getOrgInitials("   ")).toBe("?")
  })

  test("trims leading/trailing whitespace before extracting", () => {
    expect(getOrgInitials("  Acme Corp  ")).toBe("AC")
  })

  test("handles extra spaces between words", () => {
    expect(getOrgInitials("Acme    Corp")).toBe("AC")
  })

  test("lowercases get uppercased", () => {
    expect(getOrgInitials("acme corp")).toBe("AC")
  })
})

// deterministic color from a hash of the org name. same name should always
// map to the same color so the avatar circle doesn't randomly change color
// every time you re-render or navigate around the app.
describe("getOrgColorIndex", () => {
  test("same name always produces the same index", () => {
    const a = getOrgColorIndex("Acme Corp")
    const b = getOrgColorIndex("Acme Corp")
    expect(a).toBe(b)
  })

  test("different names produce different indices", () => {
    const a = getOrgColorIndex("Acme Corp")
    const b = getOrgColorIndex("Globex Industries")
    expect(a).not.toBe(b)
  })

  test("result is always non-negative", () => {
    const names = ["a", "zzz", "Org With Many Words In The Name", "日本語"]
    for (const name of names) {
      expect(getOrgColorIndex(name)).toBeGreaterThanOrEqual(0)
    }
  })

  test("casing is normalized so 'Acme' and 'acme' get the same color", () => {
    expect(getOrgColorIndex("Acme")).toBe(getOrgColorIndex("acme"))
  })
})

describe("getOrgColor", () => {
  test("returns a value from the ORG_AVATAR_COLORS palette", () => {
    const color = getOrgColor("Acme Corp")
    expect(ORG_AVATAR_COLORS).toContain(color)
  })

  test("deterministic: same name always same color", () => {
    expect(getOrgColor("Test Org")).toBe(getOrgColor("Test Org"))
  })
})

// xss gate for org logo urls. org admins can set whatever logo url they want,
// so we gotta make sure nobody sneaks in a `javascript:` or `vbscript:` url
// that would execute when we stick it in an `<img>` tag or anywhere else in
// the dom. also blocks `data:` urls that aren't actual images since those
// can carry scripts too.
describe("sanitizeLogoUrl", () => {
  test("allows normal https URLs through", () => {
    expect(sanitizeLogoUrl("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png"
    )
  })

  test("allows http URLs through", () => {
    expect(sanitizeLogoUrl("http://example.com/logo.png")).toBe(
      "http://example.com/logo.png"
    )
  })

  test("allows data:image URLs for file previews", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo="
    expect(sanitizeLogoUrl(dataUrl)).toBe(dataUrl)
  })

  test("allows blob URLs for local file objects", () => {
    const blobUrl = "blob:http://localhost:3000/some-uuid"
    expect(sanitizeLogoUrl(blobUrl)).toBe(blobUrl)
  })

  test("blocks javascript: protocol", () => {
    expect(sanitizeLogoUrl("javascript:alert(1)")).toBe("")
  })

  test("blocks vbscript: protocol", () => {
    expect(sanitizeLogoUrl("vbscript:MsgBox('hi')")).toBe("")
  })

  test("blocks data: URLs that aren't images", () => {
    expect(sanitizeLogoUrl("data:text/html,<script>alert(1)</script>")).toBe("")
  })

  test("returns empty string for null/undefined", () => {
    expect(sanitizeLogoUrl(null)).toBe("")
    expect(sanitizeLogoUrl(undefined)).toBe("")
  })

  test("returns empty string for empty/whitespace strings", () => {
    expect(sanitizeLogoUrl("")).toBe("")
    expect(sanitizeLogoUrl("   ")).toBe("")
  })

  test("passes through relative URLs", () => {
    expect(sanitizeLogoUrl("/logos/acme.png")).toBe("/logos/acme.png")
  })

  test("trims whitespace before checking", () => {
    expect(sanitizeLogoUrl("  https://example.com/logo.png  ")).toBe(
      "https://example.com/logo.png"
    )
  })
})
