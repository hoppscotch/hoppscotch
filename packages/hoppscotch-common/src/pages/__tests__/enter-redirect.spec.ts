import { describe, expect, it } from "vitest"
import { getSafeRedirectUrl } from "../enter-redirect"

const ROOT = "hoppscotch.io"

describe("getSafeRedirectUrl", () => {
  it("allows a valid org subdomain", () => {
    const result = getSafeRedirectUrl("acme.hoppscotch.io/enter", ROOT)
    expect(result).not.toBeNull()
    expect(result!.hostname).toBe("acme.hoppscotch.io")
  })

  it("allows the root domain itself", () => {
    const result = getSafeRedirectUrl("hoppscotch.io/enter", ROOT)
    expect(result).not.toBeNull()
    expect(result!.hostname).toBe("hoppscotch.io")
  })

  it("rejects an external domain", () => {
    expect(getSafeRedirectUrl("example.com", ROOT)).toBeNull()
  })

  it("rejects a domain that ends with the root but is not a subdomain", () => {
    expect(getSafeRedirectUrl("evil-hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects a domain that contains the root as an interior label", () => {
    expect(
      getSafeRedirectUrl("example.com.hoppscotch.io.attacker.com", ROOT)
    ).toBeNull()
  })

  it("rejects backslashes (WHATWG normalization bypass)", () => {
    expect(
      getSafeRedirectUrl("acme.hoppscotch.io\\@example.com", ROOT)
    ).toBeNull()
  })

  it("rejects tab characters (WHATWG strip bypass)", () => {
    expect(getSafeRedirectUrl("evil.com\tacme.hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects newline characters (WHATWG strip bypass)", () => {
    expect(getSafeRedirectUrl("evil.com\nacme.hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects carriage-return characters (WHATWG strip bypass)", () => {
    expect(getSafeRedirectUrl("evil.com\racme.hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects percent-encoded backslashes", () => {
    expect(getSafeRedirectUrl("%5C%5Cexample.com", ROOT)).toBeNull()
  })

  it("rejects auth-parameter attacks (@)", () => {
    const result = getSafeRedirectUrl("hoppscotch.io@example.com", ROOT)
    expect(result).toBeNull()
  })

  it("rejects userinfo on an allowed hostname", () => {
    expect(
      getSafeRedirectUrl("acme.hoppscotch.io@hoppscotch.io", ROOT)
    ).toBeNull()
  })

  it("rejects userinfo with credentials on an allowed hostname", () => {
    expect(getSafeRedirectUrl("user:pass@hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects percent-encoded null bytes", () => {
    expect(getSafeRedirectUrl("example.com%00.hoppscotch.io", ROOT)).toBeNull()
  })

  it("rejects empty input", () => {
    expect(getSafeRedirectUrl("", ROOT)).toBeNull()
  })

  it("returns null when rootDomain is undefined", () => {
    expect(getSafeRedirectUrl("acme.hoppscotch.io", undefined)).toBeNull()
  })

  it("returns null when rootDomain is empty string", () => {
    expect(getSafeRedirectUrl("acme.hoppscotch.io", "")).toBeNull()
  })

  it("preserves path and query from the redirect value", () => {
    const result = getSafeRedirectUrl("acme.hoppscotch.io/enter?foo=bar", ROOT)
    expect(result).not.toBeNull()
    expect(result!.pathname).toBe("/enter")
    expect(result!.searchParams.get("foo")).toBe("bar")
  })
})
