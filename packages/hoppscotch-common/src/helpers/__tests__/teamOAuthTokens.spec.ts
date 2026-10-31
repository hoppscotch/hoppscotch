import { beforeEach, describe, expect, it } from "vitest"

import { getService } from "~/modules/dioc"
import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

import {
  hydrateCollectionAuth,
  hydrateTeamRequest,
  readOAuthTokenRecord,
  redactCollectionDataForTeamWire,
  redactRequestJsonForTeamWire,
  splitRequestForTeamCreate,
  stripOAuthTokensDeep,
  teamCollectionTokenKey,
  teamRequestTokenKey,
} from "../teamOAuthTokens"

const oauthAuth = (token: string, refreshToken?: string) => ({
  authType: "oauth-2" as const,
  authActive: true,
  addTo: "HEADERS" as const,
  grantTypeInfo: {
    grantType: "AUTHORIZATION_CODE" as const,
    token,
    ...(refreshToken !== undefined ? { refreshToken } : {}),
  },
})

describe("team OAuth tokens", () => {
  beforeEach(() => {
    getService(TeamOAuthTokenService).tokens.clear()
  })

  it("leaves non-OAuth auth untouched", () => {
    const auth = { authType: "bearer", token: "keep-me", authActive: true }
    expect(stripOAuthTokensDeep(auth)).toBe(auth)
    expect(readOAuthTokenRecord(auth)).toBeNull()
  })

  it("blanks OAuth tokens without mutating the input", () => {
    const auth = oauthAuth("access", "refresh")
    const stripped = stripOAuthTokensDeep(auth)

    expect(stripped).not.toBe(auth)
    expect(auth.grantTypeInfo.token).toBe("access")
    expect(stripped.grantTypeInfo.token).toBe("")
    expect(stripped.grantTypeInfo.refreshToken).toBe("")
    expect(stripped.grantTypeInfo.grantType).toBe("AUTHORIZATION_CODE")
  })

  it("blanks tokens nested in saved examples", () => {
    const request = {
      name: "List",
      auth: oauthAuth("live"),
      responses: {
        sample: {
          originalRequest: {
            auth: oauthAuth("snapshot"),
          },
        },
      },
    }

    const stripped = stripOAuthTokensDeep(request)

    expect(stripped.auth.grantTypeInfo.token).toBe("")
    expect(
      stripped.responses.sample.originalRequest.auth.grantTypeInfo.token
    ).toBe("")
    expect(request.auth.grantTypeInfo.token).toBe("live")
  })

  it("keeps the caller's token locally and omits it from the team payload", () => {
    const request = {
      name: "List",
      auth: oauthAuth("live-token", "live-refresh"),
      responses: {
        sample: { originalRequest: { auth: oauthAuth("snapshot") } },
      },
    }

    const wire = redactRequestJsonForTeamWire("req-1", JSON.stringify(request))
    const parsed = JSON.parse(wire)

    expect(parsed.auth.grantTypeInfo.token).toBe("")
    expect(parsed.auth.grantTypeInfo.refreshToken).toBe("")
    expect(
      parsed.responses.sample.originalRequest.auth.grantTypeInfo.token
    ).toBe("")
    expect(parsed.auth.grantTypeInfo.grantType).toBe("AUTHORIZATION_CODE")

    expect(
      getService(TeamOAuthTokenService).recall(teamRequestTokenKey("req-1"))
    ).toEqual({ token: "live-token", refreshToken: "live-refresh" })
  })

  it("drops a stored token when the caller clears it", () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "live-token",
      refreshToken: "live-refresh",
    })

    redactRequestJsonForTeamWire(
      "req-1",
      JSON.stringify({ auth: oauthAuth("") })
    )

    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()
  })

  it("ignores a token that arrived from the shared team document", () => {
    const request = { auth: oauthAuth("teammate-token") }

    expect(hydrateTeamRequest("req-2", request).auth.grantTypeInfo.token).toBe(
      ""
    )
  })

  it("restores only this user's token onto a team request", () => {
    getService(TeamOAuthTokenService).remember(teamRequestTokenKey("req-2"), {
      token: "mine",
      refreshToken: "my-refresh",
    })

    const hydrated = hydrateTeamRequest("req-2", {
      auth: oauthAuth("teammate-token", "teammate-refresh"),
    })

    expect(hydrated.auth.grantTypeInfo.token).toBe("mine")
    expect(hydrated.auth.grantTypeInfo.refreshToken).toBe("my-refresh")
  })

  it("stores a collection token locally and strips it from the wire body", () => {
    const data = {
      auth: oauthAuth("collection-token"),
      headers: [],
      variables: [],
    }

    const wire = redactCollectionDataForTeamWire("coll-1", data)

    expect(wire.auth.grantTypeInfo.token).toBe("")
    expect(data.auth.grantTypeInfo.token).toBe("collection-token")
    expect(
      getService(TeamOAuthTokenService).recall(teamCollectionTokenKey("coll-1"))
    ).toEqual({ token: "collection-token" })
  })

  it("applies the local collection token and ignores the shared one", () => {
    getService(TeamOAuthTokenService).remember(
      teamCollectionTokenKey("coll-1"),
      { token: "mine" }
    )

    const auth = hydrateCollectionAuth("coll-1", oauthAuth("theirs"))

    expect(auth.grantTypeInfo.token).toBe("mine")
    expect(
      hydrateCollectionAuth("coll-2", oauthAuth("theirs")).grantTypeInfo.token
    ).toBe("")
  })

  it("separates a create payload so the token can be stored after an id exists", () => {
    const { wireJson, captured } = splitRequestForTeamCreate(
      JSON.stringify({ auth: oauthAuth("new-token", "new-refresh") })
    )

    expect(captured).toEqual({
      token: "new-token",
      refreshToken: "new-refresh",
    })
    expect(JSON.parse(wireJson).auth.grantTypeInfo.token).toBe("")
    expect(JSON.parse(wireJson).auth.grantTypeInfo.refreshToken).toBe("")
  })
})
