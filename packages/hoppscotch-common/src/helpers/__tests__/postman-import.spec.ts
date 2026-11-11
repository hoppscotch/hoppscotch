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

const POSTMAN_SCHEMA =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"

const pmAuth = (
  type: string,
  params: Record<string, string | boolean>
): Record<string, unknown> => ({
  type,
  [type]: Object.entries(params).map(([key, value]) => ({
    key,
    value,
    type: typeof value === "boolean" ? "boolean" : "string",
  })),
})

const importAuth = async (auth: Record<string, unknown>) => {
  const result = await hoppPostmanImporter([
    JSON.stringify({
      info: { name: "Auth Import", schema: POSTMAN_SCHEMA },
      item: [
        {
          name: "Request",
          request: { method: "GET", url: "https://echo.hoppscotch.io", auth },
        },
      ],
    }),
  ])()

  if (E.isLeft(result)) {
    throw new Error("Expected Postman import to succeed")
  }

  return result.right[0].requests[0].auth
}

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

  describe("auth import", () => {
    it("imports AWS Signature auth", async () => {
      const auth = await importAuth(
        pmAuth("awsv4", {
          accessKey: "{{accessKey}}",
          secretKey: "secret",
          region: "us-east-1",
          service: "execute-api",
          sessionToken: "session-token",
          addAuthDataToQuery: true,
        })
      )

      expect(auth).toEqual({
        authType: "aws-signature",
        authActive: true,
        accessKey: "<<accessKey>>",
        secretKey: "secret",
        region: "us-east-1",
        serviceName: "execute-api",
        serviceToken: "session-token",
        addTo: "QUERY_PARAMS",
      })
    })

    it("sends AWS Signature auth in the headers by default", async () => {
      const auth = await importAuth(
        pmAuth("awsv4", {
          accessKey: "key",
          secretKey: "secret",
          region: "eu-west-1",
          service: "s3",
        })
      )

      expect(auth).toEqual({
        authType: "aws-signature",
        authActive: true,
        accessKey: "key",
        secretKey: "secret",
        region: "eu-west-1",
        serviceName: "s3",
        addTo: "HEADERS",
      })
    })

    it("imports Digest auth", async () => {
      const auth = await importAuth(
        pmAuth("digest", {
          username: "{{user}}",
          password: "pass",
          realm: "api",
          nonce: "abc",
          algorithm: "MD5-sess",
          qop: "auth-int",
          nonceCount: "00000001",
          clientNonce: "xyz",
          opaque: "opaque",
          disableRetryRequest: true,
        })
      )

      expect(auth).toEqual({
        authType: "digest",
        authActive: true,
        username: "<<user>>",
        password: "pass",
        realm: "api",
        nonce: "abc",
        algorithm: "MD5-sess",
        qop: "auth-int",
        nc: "00000001",
        cnonce: "xyz",
        opaque: "opaque",
        disableRetry: true,
      })
    })

    it("falls back to the supported Digest defaults for unsupported options", async () => {
      const auth = await importAuth(
        pmAuth("digest", {
          username: "user",
          password: "pass",
          algorithm: "SHA-256",
          qop: "",
        })
      )

      expect(auth).toMatchObject({
        authType: "digest",
        algorithm: "MD5",
        qop: "auth",
        disableRetry: false,
      })
    })

    it("imports Hawk auth", async () => {
      const auth = await importAuth(
        pmAuth("hawk", {
          authId: "{{hawkId}}",
          authKey: "hawk-key",
          algorithm: "sha1",
          user: "user",
          nonce: "nonce",
          extraData: "ext",
          app: "app",
          delegation: "dlg",
          timestamp: "1700000000",
          includePayloadHash: true,
        })
      )

      expect(auth).toEqual({
        authType: "hawk",
        authActive: true,
        authId: "<<hawkId>>",
        authKey: "hawk-key",
        algorithm: "sha1",
        includePayloadHash: true,
        user: "user",
        nonce: "nonce",
        ext: "ext",
        app: "app",
        dlg: "dlg",
        timestamp: "1700000000",
      })
    })

    it("leaves the optional Hawk fields unset when they are empty", async () => {
      const auth = await importAuth(
        pmAuth("hawk", {
          authId: "id",
          authKey: "key",
          algorithm: "sha256",
          user: "",
          includePayloadHash: false,
        })
      )

      expect(auth).toMatchObject({
        authType: "hawk",
        algorithm: "sha256",
        includePayloadHash: false,
        user: undefined,
        nonce: undefined,
        ext: undefined,
      })
    })

    it("imports JWT auth sent in the request header", async () => {
      const auth = await importAuth(
        pmAuth("jwt", {
          algorithm: "HS512",
          secret: "{{jwtSecret}}",
          isSecretBase64Encoded: true,
          payload: '{"sub":"1234"}',
          addTokenTo: "header",
          headerPrefix: "Token",
          queryParamKey: "token",
          header: '{"kid":"abc"}',
        })
      )

      expect(auth).toEqual({
        authType: "jwt",
        authActive: true,
        secret: "<<jwtSecret>>",
        privateKey: "",
        algorithm: "HS512",
        payload: '{"sub":"1234"}',
        addTo: "HEADERS",
        isSecretBase64Encoded: true,
        headerPrefix: "Token ",
        paramName: "token",
        jwtHeaders: '{"kid":"abc"}',
      })
    })

    it("imports JWT auth sent as a query parameter", async () => {
      const auth = await importAuth(
        pmAuth("jwt", {
          algorithm: "RS256",
          privateKey: "-----BEGIN PRIVATE KEY-----",
          addTokenTo: "queryParam",
          queryParamKey: "access_token",
        })
      )

      expect(auth).toMatchObject({
        authType: "jwt",
        algorithm: "RS256",
        privateKey: "-----BEGIN PRIVATE KEY-----",
        addTo: "QUERY_PARAMS",
        paramName: "access_token",
        payload: "{}",
        jwtHeaders: "{}",
        isSecretBase64Encoded: false,
      })
    })

    it("maps the JWT header prefix the way Postman applies it", async () => {
      const missingPrefix = await importAuth(
        pmAuth("jwt", { algorithm: "HS256", secret: "s" })
      )
      const emptyPrefix = await importAuth(
        pmAuth("jwt", { algorithm: "HS256", secret: "s", headerPrefix: "" })
      )

      expect(missingPrefix).toMatchObject({ headerPrefix: "Bearer " })
      expect(emptyPrefix).toMatchObject({ headerPrefix: "" })
    })

    it("falls back to HS256 for unknown JWT algorithms", async () => {
      const auth = await importAuth(
        pmAuth("jwt", { algorithm: "none", secret: "s" })
      )

      expect(auth).toMatchObject({ authType: "jwt", algorithm: "HS256" })
    })

    it("imports the auth set on a folder", async () => {
      const result = await hoppPostmanImporter([
        JSON.stringify({
          info: { name: "Folder Auth", schema: POSTMAN_SCHEMA },
          auth: pmAuth("digest", { username: "user", password: "pass" }),
          item: [],
        }),
      ])()

      if (E.isLeft(result)) {
        throw new Error("Expected Postman import to succeed")
      }

      expect(result.right[0].auth).toMatchObject({
        authType: "digest",
        username: "user",
        password: "pass",
      })
    })
  })
})
