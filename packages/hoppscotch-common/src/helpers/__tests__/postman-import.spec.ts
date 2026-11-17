import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppPostmanImporter } from "../import-export/import/postman"

const postmanCollectionWithArrayHeader = JSON.stringify({
  info: {
    name: "Array Header Import",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Import Array Header",
      request: {
        method: "GET",
        header: [
          {
            key: "Authorization",
            value: ["Basic xxxxx", "Basic xxxxxxxxxxxx="],
          },
          {
            key: "Content-Type",
            value: "application/x-www-form-urlencoded",
          },
        ],
        url: "https://echo.hoppscotch.io/get",
      },
    },
  ],
})

const postmanCollectionWithBasicOAuthAuthentication = JSON.stringify({
  info: {
    name: "OAuth2 Basic Authentication Import",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Import OAuth2 Basic Authentication",
      request: {
        method: "GET",
        auth: {
          type: "oauth2",
          oauth2: [
            { key: "authUrl", value: "https://example.com/oauth/authorize" },
            { key: "accessTokenUrl", value: "https://example.com/oauth/token" },
            { key: "clientId", value: "client-id" },
            { key: "clientSecret", value: "client-secret" },
            { key: "client_authentication", value: "header" },
          ],
        },
        url: "https://echo.hoppscotch.io/get",
      },
    },
  ],
})

describe("Postman importer", () => {
  it("coerces array header values instead of crashing during import", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithArrayHeader,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Authorization",
          value: "Basic xxxxx,Basic xxxxxxxxxxxx=",
          active: true,
        }),
        expect.objectContaining({
          key: "Content-Type",
          value: "application/x-www-form-urlencoded",
          active: true,
        }),
      ])
    )
  })

  it("preserves Postman Basic OAuth2 client authentication", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithBasicOAuthAuthentication,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].auth).toMatchObject({
      authType: "oauth-2",
      grantTypeInfo: {
        clientAuthentication: "AS_BASIC_AUTH_HEADERS",
      },
    })
  })
})
