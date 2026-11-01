import { beforeEach, describe, expect, it } from "vitest"

import { getService } from "~/modules/dioc"
import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

import { readScopedTeamOAuthTokenStore } from "~/services/team-oauth-token.service"

import {
  commitTokenSyncPlan,
  hydrateCollectionAuth,
  hydrateTeamRequest,
  prepareTeamImportJson,
  readOAuthTokenRecord,
  rehydrateTeamCollectionOAuthTokens,
  redactCollectionDataForTeamWire,
  redactRequestJsonForTeamWire,
  separateCollectionForTeamUpdate,
  separateRequestForTeamUpdate,
  splitRequestForTeamCreate,
  stripOAuthTokensDeep,
  teamCollectionImportKey,
  teamCollectionTokenKey,
  teamRequestImportKey,
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
    const service = getService(TeamOAuthTokenService)
    service.loadFromPersistedState({})
    service.setActiveUser("user-a")
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

    const { wireJson, plan } = separateRequestForTeamUpdate(
      "req-1",
      JSON.stringify(request)
    )
    const parsed = JSON.parse(wireJson)

    expect(parsed.auth.grantTypeInfo.token).toBe("")
    expect(parsed.auth.grantTypeInfo.refreshToken).toBe("")
    expect(
      parsed.responses.sample.originalRequest.auth.grantTypeInfo.token
    ).toBe("")
    expect(parsed.auth.grantTypeInfo.grantType).toBe("AUTHORIZATION_CODE")
    expect(
      getService(TeamOAuthTokenService).recall(teamRequestTokenKey("req-1"))
    ).toBeUndefined()

    const revision = getService(TeamOAuthTokenService).revision.value
    commitTokenSyncPlan(plan)

    expect(getService(TeamOAuthTokenService).revision.value).toBe(revision + 1)
    expect(
      getService(TeamOAuthTokenService).recall(teamRequestTokenKey("req-1"))
    ).toEqual({ token: "live-token", refreshToken: "live-refresh" })
    expect(redactRequestJsonForTeamWire("req-1", JSON.stringify(request))).toBe(
      wireJson
    )
  })

  it("leaves the stored token in place until the save is committed", () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })

    const { plan } = separateRequestForTeamUpdate(
      "req-1",
      JSON.stringify({ auth: oauthAuth("new-token", "new-refresh") })
    )

    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "old-token",
      refreshToken: "old-refresh",
    })

    commitTokenSyncPlan(plan)

    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "new-token",
      refreshToken: "new-refresh",
    })
  })

  it("drops a stored token when the caller clears it", () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "live-token",
      refreshToken: "live-refresh",
    })

    const { plan } = separateRequestForTeamUpdate(
      "req-1",
      JSON.stringify({ auth: oauthAuth("") })
    )

    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "live-token",
      refreshToken: "live-refresh",
    })

    const revision = service.revision.value
    commitTokenSyncPlan(plan)

    expect(service.revision.value).toBe(revision + 1)
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

    const { wire, plan } = separateCollectionForTeamUpdate("coll-1", data)

    expect(wire.auth.grantTypeInfo.token).toBe("")
    expect(data.auth.grantTypeInfo.token).toBe("collection-token")
    const service = getService(TeamOAuthTokenService)
    expect(service.recall(teamCollectionTokenKey("coll-1"))).toBeUndefined()

    const revision = service.revision.value
    commitTokenSyncPlan(plan)

    // Collection auth is read when the folder is opened, so a collection
    // commit must not force every cached request to hydrate again.
    expect(service.revision.value).toBe(revision)
    expect(service.recall(teamCollectionTokenKey("coll-1"))).toEqual({
      token: "collection-token",
    })
    expect(redactCollectionDataForTeamWire("coll-1", data)).toEqual(wire)
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

  it("hides tokens from other accounts and restores them on return", () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "a-token",
      refreshToken: "a-refresh",
    })

    service.setActiveUser("user-b")
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()
    service.remember(teamRequestTokenKey("req-1"), { token: "b-token" })

    service.setActiveUser(null)
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()
    service.remember(teamRequestTokenKey("req-1"), { token: "signed-out" })
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()

    service.setActiveUser("user-a")
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "a-token",
      refreshToken: "a-refresh",
    })

    expect(service.persistableTokens.value).toEqual({
      "user-a": {
        [teamRequestTokenKey("req-1")]: {
          token: "a-token",
          refreshToken: "a-refresh",
        },
      },
      "user-b": {
        [teamRequestTokenKey("req-1")]: { token: "b-token" },
      },
    })
  })

  it("drops an unscoped persisted map instead of giving it to the current user", () => {
    const legacy = {
      [teamRequestTokenKey("req-1")]: { token: "previous-account" },
    }
    const scoped = readScopedTeamOAuthTokenStore(legacy)
    expect(scoped).toEqual({ tokens: {}, legacyUnscoped: true })

    const service = getService(TeamOAuthTokenService)
    service.loadFromPersistedState(scoped?.tokens ?? {})
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()

    const kept = readScopedTeamOAuthTokenStore({
      "user-a": {
        [teamRequestTokenKey("req-1")]: { token: "mine" },
      },
    })
    expect(kept).toEqual({
      tokens: {
        "user-a": {
          [teamRequestTokenKey("req-1")]: { token: "mine" },
        },
      },
      legacyUnscoped: false,
    })
    service.loadFromPersistedState(kept?.tokens ?? {})
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "mine",
    })
  })

  it("refreshes requests that were hydrated before the token map was ready", () => {
    const service = getService(TeamOAuthTokenService)
    const tree = [
      {
        requests: [
          {
            id: "req-1",
            request: { auth: oauthAuth(""), _ref_id: "req_ref" },
          },
        ],
        children: [
          {
            requests: [
              {
                id: "req-2",
                request: { auth: oauthAuth("server-token") },
              },
            ],
            children: null,
          },
        ],
      },
    ]

    rehydrateTeamCollectionOAuthTokens(tree)
    expect(tree[0].requests[0].request.auth.grantTypeInfo.token).toBe("")

    service.loadFromPersistedState({
      "user-a": {
        [teamRequestTokenKey("req-1")]: { token: "loaded-later" },
        [teamRequestTokenKey("req-2")]: { token: "nested" },
      },
    })
    rehydrateTeamCollectionOAuthTokens(tree)

    expect(tree[0].requests[0].request.auth.grantTypeInfo.token).toBe(
      "loaded-later"
    )
    expect(
      tree[0].children[0].requests[0].request.auth.grantTypeInfo.token
    ).toBe("nested")

    service.setActiveUser("user-b")
    rehydrateTeamCollectionOAuthTokens(tree)
    expect(tree[0].requests[0].request.auth.grantTypeInfo.token).toBe("")
  })

  it("strips collection tokens from import data and restores them by ref id", () => {
    const service = getService(TeamOAuthTokenService)
    const document = [
      {
        name: "Root",
        folders: [
          {
            name: "Nested",
            folders: [],
            requests: [
              {
                name: "Nested request",
                _ref_id: "req_nested",
                auth: oauthAuth("nested-access", "nested-refresh"),
              },
            ],
            data: JSON.stringify({
              _ref_id: "coll_nested",
              auth: oauthAuth("nested-coll-access", "nested-coll-refresh"),
              headers: [],
            }),
          },
        ],
        requests: [
          {
            name: "Root request",
            _ref_id: "req_root",
            auth: oauthAuth("root-access", "root-refresh"),
            responses: {
              sample: {
                originalRequest: { auth: oauthAuth("example-access") },
              },
            },
          },
        ],
        data: JSON.stringify({
          _ref_id: "coll_root",
          auth: oauthAuth("root-coll-access", "root-coll-refresh"),
          headers: [],
          variables: [],
        }),
      },
    ]

    const { wireJson, pending } = prepareTeamImportJson(
      JSON.stringify(document)
    )
    const wire = JSON.parse(wireJson)
    const rootData = JSON.parse(wire[0].data)
    const nestedData = JSON.parse(wire[0].folders[0].data)

    expect(rootData.auth.grantTypeInfo.token).toBe("")
    expect(rootData.auth.grantTypeInfo.refreshToken).toBe("")
    expect(rootData.auth.grantTypeInfo.grantType).toBe("AUTHORIZATION_CODE")
    expect(nestedData.auth.grantTypeInfo.token).toBe("")
    expect(nestedData.auth.grantTypeInfo.refreshToken).toBe("")
    expect(wire[0].requests[0].auth.grantTypeInfo.token).toBe("")
    expect(wire[0].requests[0].auth.grantTypeInfo.refreshToken).toBe("")
    expect(
      wire[0].requests[0].responses.sample.originalRequest.auth.grantTypeInfo
        .token
    ).toBe("")
    expect(wire[0].folders[0].requests[0].auth.grantTypeInfo.token).toBe("")
    expect(wire[0].folders[0].requests[0].auth.grantTypeInfo.refreshToken).toBe(
      ""
    )
    expect(wireJson).not.toContain("root-access")
    expect(wireJson).not.toContain("root-coll-access")
    expect(wireJson).not.toContain("nested-access")
    expect(wireJson).not.toContain("nested-coll-access")
    expect(wireJson).not.toContain("example-access")

    expect(service.recall(teamRequestImportKey("req_root"))).toBeUndefined()
    for (const item of pending) service.remember(item.key, item.record)

    const request = hydrateTeamRequest("backend-req", {
      ...wire[0].requests[0],
    })
    expect(request.auth.grantTypeInfo.token).toBe("root-access")
    expect(request.auth.grantTypeInfo.refreshToken).toBe("root-refresh")
    expect(
      request.responses.sample.originalRequest.auth.grantTypeInfo.token
    ).toBe("")
    expect(service.recall(teamRequestTokenKey("backend-req"))).toEqual({
      token: "root-access",
      refreshToken: "root-refresh",
    })
    expect(service.recall(teamRequestImportKey("req_root"))).toBeUndefined()

    const nestedRequest = hydrateTeamRequest(
      "backend-nested-req",
      wire[0].folders[0].requests[0]
    )
    expect(nestedRequest.auth.grantTypeInfo.token).toBe("nested-access")

    const rootAuth = hydrateCollectionAuth(
      "backend-coll",
      rootData.auth,
      rootData._ref_id
    )
    expect(rootAuth.grantTypeInfo.token).toBe("root-coll-access")
    expect(rootAuth.grantTypeInfo.refreshToken).toBe("root-coll-refresh")
    expect(service.recall(teamCollectionTokenKey("backend-coll"))).toEqual({
      token: "root-coll-access",
      refreshToken: "root-coll-refresh",
    })
    expect(service.recall(teamCollectionImportKey("coll_root"))).toBeUndefined()

    const nestedAuth = hydrateCollectionAuth(
      "backend-nested-coll",
      nestedData.auth,
      nestedData._ref_id
    )
    expect(nestedAuth.grantTypeInfo.token).toBe("nested-coll-access")

    service.setActiveUser("user-b")
    expect(
      hydrateTeamRequest("backend-req", wire[0].requests[0]).auth.grantTypeInfo
        .token
    ).toBe("")
  })

  it("stamps a ref id when an imported request has a token but no ref", () => {
    const { wireJson, pending } = prepareTeamImportJson(
      JSON.stringify([
        {
          name: "Root",
          folders: [],
          requests: [{ name: "Untitled", auth: oauthAuth("fresh-token") }],
          data: JSON.stringify({ auth: oauthAuth("fresh-coll-token") }),
        },
      ])
    )

    const wire = JSON.parse(wireJson)
    expect(wire[0].requests[0]._ref_id).toEqual(expect.any(String))
    expect(JSON.parse(wire[0].data)._ref_id).toEqual(expect.any(String))
    expect(wire[0].requests[0].auth.grantTypeInfo.token).toBe("")
    expect(pending).toHaveLength(2)
    expect(wireJson).not.toContain("fresh-token")
    expect(wireJson).not.toContain("fresh-coll-token")
  })

  it("leaves non-OAuth import auth untouched", () => {
    const bearer = { authType: "bearer", token: "keep-me", authActive: true }
    const original = JSON.stringify([
      {
        name: "Root",
        folders: [],
        requests: [{ name: "Untitled", auth: bearer }],
        data: JSON.stringify({ auth: bearer, headers: [] }),
      },
    ])

    const { wireJson, pending } = prepareTeamImportJson(original)
    const wire = JSON.parse(wireJson)

    expect(pending).toEqual([])
    expect(wire[0].requests[0].auth.token).toBe("keep-me")
    expect(JSON.parse(wire[0].data).auth.token).toBe("keep-me")
  })
})
