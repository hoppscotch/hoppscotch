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
