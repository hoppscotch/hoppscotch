import { describe, expect, it } from "vitest"
import {
  AuthCodeGrantTypeParams,
  getDefaultRESTRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  getPayloadForClientCredentialsTokenRequest,
  getPayloadForAuthCodeTokenRequest,
  getPayloadForRefreshTokenRequest,
} from "../../clientAuthentication"

const getBodyParams = (
  request: ReturnType<typeof getPayloadForAuthCodeTokenRequest>
) => {
  if (!request.content || request.content.kind !== "urlencoded") {
    throw new Error("Expected a URL-encoded request body")
  }

  return new URLSearchParams(request.content.content)
}

const baseRequestParams = {
  tokenEndpoint: "https://example.com/oauth/token",
  redirectURI: "https://example.com/oauth/callback",
  clientID: "client-id",
  clientSecret: "client-secret",
  code: "authorization-code",
  codeVerifier: "code-verifier",
}

describe("Authorization Code OAuth flow", () => {
  it("sends client credentials in the body by default", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      clientAuthentication: "IN_BODY",
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    })
    expect(bodyParams.get("client_id")).toBe("client-id")
    expect(bodyParams.get("client_secret")).toBe("client-secret")
    expect(bodyParams.get("code")).toBe("authorization-code")
    expect(bodyParams.get("grant_type")).toBe("authorization_code")
    expect(bodyParams.get("redirect_uri")).toBe(
      "https://example.com/oauth/callback"
    )
    expect(bodyParams.get("code_verifier")).toBe("code-verifier")
  })

  it("sends client credentials using Basic authentication when selected", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      clientID: "client id",
      clientSecret: "client&secret",
      clientAuthentication: "AS_BASIC_AUTH_HEADERS",
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers).toEqual({
      Authorization: `Basic ${btoa("client+id:client%26secret")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    })
    expect(bodyParams.has("client_id")).toBe(false)
    expect(bodyParams.has("client_secret")).toBe(false)
    expect(bodyParams.get("code")).toBe("authorization-code")
    expect(bodyParams.get("grant_type")).toBe("authorization_code")
    expect(bodyParams.get("redirect_uri")).toBe(
      "https://example.com/oauth/callback"
    )
    expect(bodyParams.get("code_verifier")).toBe("code-verifier")
  })

  it("sends advanced token request parameters in their configured locations", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      tokenRequestParams: [
        { id: 1, key: "audience", value: "api", active: true, sendIn: "url" },
        {
          id: 2,
          key: "resource",
          value: "https://example.com/api",
          active: true,
          sendIn: "body",
        },
        {
          id: 3,
          key: "X-Request-Source",
          value: "hoppscotch",
          active: true,
          sendIn: "headers",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(new URL(request.url).searchParams.get("audience")).toBe("api")
    expect(bodyParams.get("resource")).toBe("https://example.com/api")
    expect(request.headers["X-Request-Source"]).toBe("hoppscotch")
  })

  it("allows scope as an advanced Authorization Code token parameter", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      tokenRequestParams: [
        {
          id: 1,
          key: "scope",
          value: "read write",
          active: true,
          sendIn: "body",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(bodyParams.get("scope")).toBe("read write")
  })

  it("omits the client secret for public clients", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      redirectURI: baseRequestParams.redirectURI,
      clientID: baseRequestParams.clientID,
      code: baseRequestParams.code,
      codeVerifier: baseRequestParams.codeVerifier,
    })
    const bodyParams = getBodyParams(request)

    expect(bodyParams.get("client_id")).toBe("client-id")
    expect(bodyParams.has("client_secret")).toBe(false)
  })

  it("preserves active advanced parameters with empty values", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      tokenRequestParams: [
        { id: 1, key: "audience", value: "", active: true, sendIn: "url" },
        { id: 2, key: "resource", value: "", active: true, sendIn: "body" },
        {
          id: 3,
          key: "X-Empty-Header",
          value: "",
          active: true,
          sendIn: "headers",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(new URL(request.url).searchParams.has("audience")).toBe(true)
    expect(bodyParams.get("resource")).toBe("")
    expect(request.headers["X-Empty-Header"]).toBe("")
  })

  it("does not allow advanced parameters to override OAuth fields", () => {
    const request = getPayloadForAuthCodeTokenRequest({
      ...baseRequestParams,
      clientAuthentication: "AS_BASIC_AUTH_HEADERS",
      tokenRequestParams: [
        {
          id: 1,
          key: "Authorization",
          value: "Bearer overridden",
          active: true,
          sendIn: "headers",
        },
        {
          id: 2,
          key: "client_id",
          value: "overridden-client",
          active: true,
          sendIn: "body",
        },
        {
          id: 3,
          key: "client_secret",
          value: "overridden-secret",
          active: true,
          sendIn: "body",
        },
        {
          id: 4,
          key: "code",
          value: "overridden-code",
          active: true,
          sendIn: "body",
        },
        {
          id: 5,
          key: "grant_type",
          value: "overridden-grant",
          active: true,
          sendIn: "body",
        },
        {
          id: 6,
          key: "redirect_uri",
          value: "https://overridden.example.com",
          active: true,
          sendIn: "body",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers.Authorization).toBe(
      `Basic ${btoa("client-id:client-secret")}`
    )
    expect(bodyParams.has("client_id")).toBe(false)
    expect(bodyParams.has("client_secret")).toBe(false)
    expect(bodyParams.get("code")).toBe("authorization-code")
    expect(bodyParams.get("grant_type")).toBe("authorization_code")
    expect(bodyParams.get("redirect_uri")).toBe(
      "https://example.com/oauth/callback"
    )
  })

  it("shares parameter placement with client credentials requests", () => {
    const request = getPayloadForClientCredentialsTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: baseRequestParams.clientID,
      clientSecret: baseRequestParams.clientSecret,
      scopes: "read",
      clientAuthentication: "AS_BASIC_AUTH_HEADERS",
      tokenRequestParams: [
        { id: 1, key: "audience", value: "api", active: true, sendIn: "url" },
        { id: 2, key: "resource", value: "", active: true, sendIn: "body" },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers.Authorization).toBe(
      `Basic ${btoa("client-id:client-secret")}`
    )
    expect(new URL(request.url).searchParams.get("audience")).toBe("api")
    expect(bodyParams.get("resource")).toBe("")
    expect(bodyParams.get("scope")).toBe("read")
    expect(bodyParams.has("client_id")).toBe(false)
  })

  it("does not allow advanced parameters to override the configured scope", () => {
    const request = getPayloadForClientCredentialsTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: baseRequestParams.clientID,
      clientSecret: baseRequestParams.clientSecret,
      scopes: "read",
      tokenRequestParams: [
        { id: 1, key: "scope", value: "write", active: true, sendIn: "body" },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(bodyParams.get("scope")).toBe("read")
  })

  it("allows an advanced scope when Client Credentials scopes are not configured", () => {
    const request = getPayloadForClientCredentialsTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: baseRequestParams.clientID,
      clientSecret: baseRequestParams.clientSecret,
      tokenRequestParams: [
        {
          id: 1,
          key: "scope",
          value: "read write",
          active: true,
          sendIn: "body",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(bodyParams.get("scope")).toBe("read write")
  })

  it("sends refresh credentials in the body by default", () => {
    const request = getPayloadForRefreshTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: baseRequestParams.clientID,
      clientSecret: baseRequestParams.clientSecret,
      refreshToken: "refresh-token",
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers.Authorization).toBeUndefined()
    expect(bodyParams.get("grant_type")).toBe("refresh_token")
    expect(bodyParams.get("refresh_token")).toBe("refresh-token")
    expect(bodyParams.get("client_id")).toBe("client-id")
    expect(bodyParams.get("client_secret")).toBe("client-secret")
  })

  it("sends refresh credentials using Basic authentication and preserves parameters", () => {
    const request = getPayloadForRefreshTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: "client id",
      clientSecret: "client&secret",
      refreshToken: "refresh-token",
      clientAuthentication: "AS_BASIC_AUTH_HEADERS",
      refreshRequestParams: [
        { id: 1, key: "audience", value: "api", active: true, sendIn: "url" },
        {
          id: 2,
          key: "X-Request-Source",
          value: "hoppscotch",
          active: true,
          sendIn: "headers",
        },
        {
          id: 3,
          key: "resource",
          value: "https://example.com/api",
          active: true,
          sendIn: "body",
        },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(request.headers.Authorization).toBe(
      `Basic ${btoa("client+id:client%26secret")}`
    )
    expect(request.headers["X-Request-Source"]).toBe("hoppscotch")
    expect(bodyParams.has("client_id")).toBe(false)
    expect(bodyParams.has("client_secret")).toBe(false)
    expect(bodyParams.get("resource")).toBe("https://example.com/api")
    expect(new URL(request.url).searchParams.get("audience")).toBe("api")
  })

  it("allows scope as an advanced refresh-token parameter", () => {
    const request = getPayloadForRefreshTokenRequest({
      tokenEndpoint: baseRequestParams.tokenEndpoint,
      clientID: baseRequestParams.clientID,
      clientSecret: baseRequestParams.clientSecret,
      refreshToken: "refresh-token",
      refreshRequestParams: [
        { id: 1, key: "scope", value: "read", active: true, sendIn: "body" },
      ],
    })
    const bodyParams = getBodyParams(request)

    expect(bodyParams.get("scope")).toBe("read")
  })

  it("defaults new and existing configurations to body authentication", () => {
    const parsed = AuthCodeGrantTypeParams.safeParse({
      grantType: "AUTHORIZATION_CODE",
      authEndpoint: "https://example.com/oauth/authorize",
      tokenEndpoint: "https://example.com/oauth/token",
      clientID: "client-id",
      clientSecret: "client-secret",
      isPKCE: false,
      authRequestParams: [],
      tokenRequestParams: [],
      refreshRequestParams: [],
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.clientAuthentication).toBe("IN_BODY")
    }
  })
})

describe("REST OAuth schema migration", () => {
  it("preserves Basic client authentication when migrating Client Credentials", () => {
    const request = {
      ...getDefaultRESTRequest(),
      v: "17",
      auth: {
        authActive: true,
        authType: "oauth-2",
        addTo: "HEADERS",
        grantTypeInfo: {
          grantType: "CLIENT_CREDENTIALS",
          authEndpoint: "https://example.com/oauth/token",
          clientID: "client-id",
          clientSecret: "client-secret",
          scopes: "read",
          token: "",
          clientAuthentication: "AS_BASIC_AUTH_HEADERS",
          tokenRequestParams: [],
          refreshRequestParams: [],
          tokenType: "access_token",
        },
      },
    }

    const parsed = HoppRESTRequest.safeParse(request)

    expect(parsed.type).toBe("ok")
    if (parsed.type === "err") return

    expect(parsed.value.v).toBe("18")
    if (parsed.value.auth.authType !== "oauth-2") return
    if (parsed.value.auth.grantTypeInfo.grantType !== "CLIENT_CREDENTIALS") {
      return
    }

    expect(parsed.value.auth.grantTypeInfo.clientAuthentication).toBe(
      "AS_BASIC_AUTH_HEADERS"
    )
  })
})
