import { describe, expect, it } from "vitest"
import { getOAuthRedirectURI } from "../redirect"

describe("getOAuthRedirectURI", () => {
  it("returns the default /oauth redirect URI when no custom URI is set", () => {
    expect(getOAuthRedirectURI()).toBe(`${window.location.origin}/oauth`)
  })

  it("returns the custom redirect URI when one is set", () => {
    expect(
      getOAuthRedirectURI({
        redirectURI: "https://example.com/oauth/callback",
      })
    ).toBe("https://example.com/oauth/callback")
  })

  it("falls back to the default /oauth redirect URI for a blank custom URI", () => {
    expect(getOAuthRedirectURI({ redirectURI: "   " })).toBe(
      `${window.location.origin}/oauth`
    )
  })
})
