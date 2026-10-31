import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  importJSONToTeam,
  updateTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import type { CollectionDataProps } from "~/helpers/backend/helpers"
import { updateTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import {
  teamCollectionTokenKey,
  teamRequestImportKey,
  teamRequestTokenKey,
} from "~/helpers/teamOAuthTokens"
import { getService } from "~/modules/dioc"
import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

const runMutation = vi.hoisted(() => vi.fn())

vi.mock("~/helpers/backend/GQLClient", () => ({
  runMutation: (...args: unknown[]) => runMutation(...args),
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

describe("team OAuth mutation token timing", () => {
  beforeEach(() => {
    runMutation.mockReset()
    const service = getService(TeamOAuthTokenService)
    service.loadFromPersistedState({})
    service.setActiveUser("user-a")
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
  })
})
