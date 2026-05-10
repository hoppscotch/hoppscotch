import { describe, expect, test } from "vitest"
import { buildAuthCodeTokenRequest } from "../tokenRequest"

const parseUrlEncodedContent = (
  request: ReturnType<typeof buildAuthCodeTokenRequest>
) => new URLSearchParams(request.content.content as string)

describe("buildAuthCodeTokenRequest", () => {
  test("adds active token request params to the request body by default", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      tokenRequestParams: [
        {
          key: "scope",
          value: "openid",
          active: true,
        },
      ],
    })

    const body = parseUrlEncodedContent(request)

    expect(body.get("grant_type")).toBe("authorization_code")
    expect(body.get("scope")).toBe("openid")
  })

  test("keeps required OAuth fields from being overridden by custom params", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      codeVerifier: "code-verifier",
      tokenRequestParams: [
        {
          key: "code",
          value: "custom-code",
          active: true,
        },
        {
          key: "grant_type",
          value: "client_credentials",
          active: true,
        },
        {
          key: "client_id",
          value: "custom-client-id",
          active: true,
        },
        {
          key: "client_secret",
          value: "custom-client-secret",
          active: true,
        },
        {
          key: "redirect_uri",
          value: "https://custom.example.com/oauth",
          active: true,
        },
        {
          key: "code_verifier",
          value: "custom-code-verifier",
          active: true,
        },
        {
          key: "scope",
          value: "openid",
          active: true,
        },
      ],
    })

    const body = parseUrlEncodedContent(request)

    expect(body.get("code")).toBe("auth-code")
    expect(body.get("grant_type")).toBe("authorization_code")
    expect(body.get("client_id")).toBe("client-id")
    expect(body.get("client_secret")).toBe("client-secret")
    expect(body.get("redirect_uri")).toBe(
      "https://hoppscotch.example.com/oauth"
    )
    expect(body.get("code_verifier")).toBe("code-verifier")
    expect(body.get("scope")).toBe("openid")
  })

  test("adds code verifier when provided", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      codeVerifier: "code-verifier",
    })

    const body = parseUrlEncodedContent(request)

    expect(body.get("code_verifier")).toBe("code-verifier")
  })

  test("omits code verifier when not provided", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
    })

    const body = parseUrlEncodedContent(request)

    expect(body.has("code_verifier")).toBe(false)
  })

  test("adds active token request params to the request URL", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      tokenRequestParams: [
        {
          key: "resource",
          value: "https://graph.microsoft.com",
          active: true,
          sendIn: "url",
        },
      ],
    })

    const url = new URL(request.url)

    expect(url.searchParams.get("resource")).toBe("https://graph.microsoft.com")
  })

  test("does not parse the token endpoint when URL params are absent", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "<<token_endpoint>>",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
    })

    expect(request.url).toBe("<<token_endpoint>>")
  })

  test("does not add required OAuth fields from URL or header params", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      tokenRequestParams: [
        {
          key: "grant_type",
          value: "client_credentials",
          active: true,
          sendIn: "url",
        },
        {
          key: "client_id",
          value: "custom-client-id",
          active: true,
          sendIn: "headers",
        },
        {
          key: "resource",
          value: "https://graph.microsoft.com",
          active: true,
          sendIn: "url",
        },
        {
          key: "X-Tenant",
          value: "tenant-id",
          active: true,
          sendIn: "headers",
        },
      ],
    })

    const url = new URL(request.url)
    const body = parseUrlEncodedContent(request)

    expect(url.searchParams.has("grant_type")).toBe(false)
    expect(request.headers.client_id).toBeUndefined()
    expect(url.searchParams.get("resource")).toBe("https://graph.microsoft.com")
    expect(request.headers["X-Tenant"]).toBe("tenant-id")
    expect(body.get("grant_type")).toBe("authorization_code")
    expect(body.get("client_id")).toBe("client-id")
  })

  test("adds active token request params to the request headers", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      tokenRequestParams: [
        {
          key: "X-Tenant",
          value: "tenant-id",
          active: true,
          sendIn: "headers",
        },
      ],
    })

    expect(request.headers["X-Tenant"]).toBe("tenant-id")
  })

  test("ignores inactive token request params", () => {
    const request = buildAuthCodeTokenRequest({
      tokenEndpoint: "https://auth.example.com/oauth/token",
      code: "auth-code",
      clientID: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://hoppscotch.example.com/oauth",
      tokenRequestParams: [
        {
          key: "scope",
          value: "openid",
          active: false,
          sendIn: "body",
        },
      ],
    })

    const body = parseUrlEncodedContent(request)

    expect(body.has("scope")).toBe(false)
  })
})
