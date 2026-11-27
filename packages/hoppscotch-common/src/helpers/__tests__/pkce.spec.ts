import { afterEach, describe, expect, test, vi } from "vitest"
import { createPKCECodeChallenge } from "../pkce"

const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

describe("createPKCECodeChallenge", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("returns the verifier for plain PKCE", async () => {
    await expect(createPKCECodeChallenge(verifier, "plain")).resolves.toBe(
      verifier
    )
  })

  test("generates the RFC 7636 S256 challenge", async () => {
    await expect(createPKCECodeChallenge(verifier, "S256")).resolves.toBe(
      challenge
    )
  })

  test("generates S256 challenge without crypto.subtle", async () => {
    vi.stubGlobal("crypto", {})

    await expect(createPKCECodeChallenge(verifier, "S256")).resolves.toBe(
      challenge
    )
  })
})
