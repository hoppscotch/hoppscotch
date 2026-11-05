import type { HoppRESTRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  importJSONToTeam,
  updateTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import type { CollectionDataProps } from "~/helpers/backend/helpers"
import {
  createRequestInCollection,
  deleteTeamRequest,
  updateTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import {
  teamCollectionImportKey,
  teamCollectionTokenKey,
  teamRequestImportKey,
  teamRequestTokenKey,
} from "~/helpers/teamOAuthTokens"
import { getService } from "~/modules/dioc"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

const runMutation = vi.hoisted(() => vi.fn())

vi.mock("~/helpers/backend/GQLClient", () => ({
  runMutation: (...args: unknown[]) => runMutation(...args),
  runGQLQuery: vi.fn(),
  runGQLSubscription: vi.fn(),
}))

// The collection helper pulls i18n at import time. These tests only need the
// team collection tree, not inherited-property updates.
vi.mock("~/helpers/collection/collection", () => ({
  updateInheritedPropertiesForAffectedRequests: vi.fn(),
}))

const oauthRequest = (token: string) =>
  JSON.stringify({
    name: "List",
    _ref_id: "req_ref",
    auth: {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        grantType: "AUTHORIZATION_CODE",
        token,
        refreshToken: `${token}-refresh`,
      },
    },
  })

const clearedOAuthRequest = () =>
  JSON.stringify({
    name: "List",
    auth: {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        grantType: "AUTHORIZATION_CODE",
        token: "",
        refreshToken: "",
      },
    },
  })

/** What `teamRequestUpdated` writes before the save response commits. */
const seedCachedRequest = (id: string, token: string, refreshToken = "") => {
  getService(TeamCollectionsService).collections.value = [
    {
      id: "coll-1",
      title: "Root",
      data: null,
      children: [],
      requests: [
        {
          id,
          collectionID: "coll-1",
          title: "List",
          request: {
            name: "List",
            auth: {
              authType: "oauth-2",
              authActive: true,
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                token,
                refreshToken,
              },
            },
          } as HoppRESTRequest,
        },
      ],
    },
  ]
}

const cachedGrant = () =>
  (
    getService(TeamCollectionsService).collections.value[0]?.requests?.[0]
      ?.request as HoppRESTRequest
  ).auth as {
    grantTypeInfo: { token: string; refreshToken?: string }
  }

describe("team OAuth mutation token timing", () => {
  beforeEach(() => {
    runMutation.mockReset()
    const service = getService(TeamOAuthTokenService)
    service.loadFromPersistedState({})
    service.setActiveUser("user-a")
  })

  afterEach(() => {
    getService(TeamCollectionsService).collections.value = []
  })

  it("keeps the previous request token when the update is rejected", async () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })
    runMutation.mockImplementation(() =>
      TE.left({ type: "network_error", error: new Error("rejected") })
    )

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: oauthRequest("new-token"),
    })()

    expect(E.isLeft(result)).toBe(true)
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "old-token",
      refreshToken: "old-refresh",
    })
    const variables = runMutation.mock.calls[0][1] as {
      data: { request: string }
    }
    expect(variables.data.request).not.toContain("new-token")
    expect(JSON.parse(variables.data.request).auth.grantTypeInfo.token).toBe("")
  })

  it("stores the request token only after the update succeeds", async () => {
    const service = getService(TeamOAuthTokenService)
    runMutation.mockImplementation(() => TE.right({ updateRequest: true }))

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: oauthRequest("new-token"),
    })()

    expect(E.isRight(result)).toBe(true)
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "new-token",
      refreshToken: "new-token-refresh",
    })
  })

  it("stores a collection token only after the update succeeds", async () => {
    const service = getService(TeamOAuthTokenService)
    runMutation.mockImplementation(() =>
      TE.left({ type: "network_error", error: new Error("rejected") })
    )

    const collectionData = {
      auth: {
        authType: "oauth-2",
        authActive: true,
        addTo: "HEADERS",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          token: "coll-token",
        },
      },
      headers: [],
      variables: [],
      description: null,
      preRequestScript: "",
      testScript: "",
    } as unknown as CollectionDataProps

    const rejected = await updateTeamCollection("coll-1", collectionData)()

    expect(E.isLeft(rejected)).toBe(true)
    expect(service.recall(teamCollectionTokenKey("coll-1"))).toBeUndefined()

    runMutation.mockImplementation(() =>
      TE.right({ updateTeamCollection: true })
    )
    const saved = await updateTeamCollection("coll-1", collectionData)()

    expect(E.isRight(saved)).toBe(true)
    expect(service.recall(teamCollectionTokenKey("coll-1"))).toEqual({
      token: "coll-token",
    })
    const variables = runMutation.mock.calls.at(-1)?.[1] as { data: string }
    expect(variables.data).not.toContain("coll-token")
  })

  it("keeps imported request tokens locally and rolls them back when import fails", async () => {
    const service = getService(TeamOAuthTokenService)
    const collectionJSON = JSON.stringify([
      {
        name: "Root",
        folders: [],
        requests: [
          {
            name: "List",
            _ref_id: "req_ref",
            auth: {
              authType: "oauth-2",
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                token: "imported-access",
                refreshToken: "imported-refresh",
              },
            },
          },
        ],
        data: JSON.stringify({
          _ref_id: "coll_ref",
          auth: {
            authType: "oauth-2",
            grantTypeInfo: {
              grantType: "AUTHORIZATION_CODE",
              token: "imported-coll",
              refreshToken: "imported-coll-refresh",
            },
          },
        }),
      },
    ])

    runMutation.mockImplementation(() =>
      TE.left({ type: "network_error", error: new Error("rejected") })
    )
    const rejected = await importJSONToTeam(collectionJSON, "team-1")()

    expect(E.isLeft(rejected)).toBe(true)
    expect(service.recall(teamRequestImportKey("req_ref"))).toBeUndefined()
    expect(service.recall(teamCollectionImportKey("coll_ref"))).toBeUndefined()
    const rejectedVariables = runMutation.mock.calls[0][1] as {
      jsonString: string
    }
    expect(rejectedVariables.jsonString).not.toContain("imported-access")
    expect(rejectedVariables.jsonString).not.toContain("imported-coll")

    runMutation.mockImplementation(() =>
      TE.right({ importCollectionsFromJSON: true })
    )
    const saved = await importJSONToTeam(collectionJSON, "team-1")()

    expect(E.isRight(saved)).toBe(true)
    expect(service.recall(teamRequestImportKey("req_ref"))).toEqual({
      token: "imported-access",
      refreshToken: "imported-refresh",
    })
    expect(service.recall(teamCollectionImportKey("coll_ref"))).toEqual({
      token: "imported-coll",
      refreshToken: "imported-coll-refresh",
    })
  })

  it("refreshes a cached request when the update arrives before the save", async () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })
    getService(TeamCollectionsService)

    runMutation.mockImplementation(() => {
      seedCachedRequest("req-1", "old-token", "old-refresh")
      return TE.right({ updateRequest: true })
    })

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: oauthRequest("new-token"),
    })()

    expect(E.isRight(result)).toBe(true)
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "new-token",
      refreshToken: "new-token-refresh",
    })
    expect(cachedGrant().grantTypeInfo).toEqual({
      grantType: "AUTHORIZATION_CODE",
      token: "new-token",
      refreshToken: "new-token-refresh",
    })
  })

  it("fills a cached request that was snapshotted with an empty token", async () => {
    getService(TeamCollectionsService)

    runMutation.mockImplementation(() => {
      seedCachedRequest("req-1", "")
      return TE.right({ updateRequest: true })
    })

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: oauthRequest("new-token"),
    })()

    expect(E.isRight(result)).toBe(true)
    expect(cachedGrant().grantTypeInfo.token).toBe("new-token")
    expect(cachedGrant().grantTypeInfo.refreshToken).toBe("new-token-refresh")
  })

  it("clears a cached request token when the committed save removes it", async () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })
    getService(TeamCollectionsService)

    runMutation.mockImplementation(() => {
      seedCachedRequest("req-1", "old-token", "old-refresh")
      return TE.right({ updateRequest: true })
    })

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: clearedOAuthRequest(),
    })()

    expect(E.isRight(result)).toBe(true)
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()
    expect(cachedGrant().grantTypeInfo.token).toBe("")
    expect(cachedGrant().grantTypeInfo.refreshToken).toBe("")
  })

  it("leaves the cached request untouched when the save is rejected", async () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })
    getService(TeamCollectionsService)
    seedCachedRequest("req-1", "old-token", "old-refresh")
    const revision = service.revision.value

    runMutation.mockImplementation(() =>
      TE.left({ type: "network_error", error: new Error("rejected") })
    )

    const result = await updateTeamRequest("req-1", {
      title: "List",
      request: oauthRequest("new-token"),
    })()

    expect(E.isLeft(result)).toBe(true)
    expect(service.revision.value).toBe(revision)
    expect(service.recall(teamRequestTokenKey("req-1"))).toEqual({
      token: "old-token",
      refreshToken: "old-refresh",
    })
    expect(cachedGrant().grantTypeInfo.token).toBe("old-token")
    expect(cachedGrant().grantTypeInfo.refreshToken).toBe("old-refresh")
  })

  it("refreshes a request cached before the create response stores its token", async () => {
    getService(TeamCollectionsService)

    runMutation.mockImplementation(() => {
      seedCachedRequest("req-new", "")
      return TE.right({ createRequestInCollection: { id: "req-new" } })
    })

    const result = await createRequestInCollection("coll-1", {
      teamID: "team-1",
      title: "List",
      request: oauthRequest("created-token"),
    })()

    expect(E.isRight(result)).toBe(true)
    expect(cachedGrant().grantTypeInfo.token).toBe("created-token")
    expect(cachedGrant().grantTypeInfo.refreshToken).toBe(
      "created-token-refresh"
    )
    expect(
      getService(TeamOAuthTokenService).recall(teamRequestTokenKey("req-new"))
    ).toEqual({
      token: "created-token",
      refreshToken: "created-token-refresh",
    })
  })

  it("clears a cached request token after the request is deleted", async () => {
    const service = getService(TeamOAuthTokenService)
    service.remember(teamRequestTokenKey("req-1"), {
      token: "old-token",
      refreshToken: "old-refresh",
    })
    getService(TeamCollectionsService)
    seedCachedRequest("req-1", "old-token", "old-refresh")

    runMutation.mockImplementation(() => TE.right({ deleteRequest: true }))

    const result = await deleteTeamRequest("req-1")()

    expect(E.isRight(result)).toBe(true)
    expect(service.recall(teamRequestTokenKey("req-1"))).toBeUndefined()
    expect(cachedGrant().grantTypeInfo.token).toBe("")
    expect(cachedGrant().grantTypeInfo.refreshToken ?? "").toBe("")
  })
})
