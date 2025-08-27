import { HoppRESTAuth } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { generateOAuth2AuthHeaders } from "../oauth2"
import { mockEnvVars } from "./test-utils"

describe("OAuth2 Auth", () => {
  describe("generateOAuth2AuthHeaders", () => {
    test("generates OAuth2 auth header for Authorization Code grant type", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "my-client-id",
          clientSecret: "my-client-secret",
          scopes: "read write",
          token: "oauth2_access_token_123",
          isPKCE: false,
          refreshToken: "refresh_token_456",
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer oauth2_access_token_123",
        description: "",
      })
    })

    test("adds OAuth2 token to query params when addTo is QUERY_PARAMS", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "client-id",
          clientSecret: "client-secret",
          scopes: "read",
          token: "query_param_token",
          isPKCE: false,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "QUERY_PARAMS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(0)
      // Note: Query params would be handled differently in the actual implementation
    })

    test("handles Client Credentials grant type", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "CLIENT_CREDENTIALS",
          authEndpoint: "https://auth.example.com/oauth/token",
          clientID: "client-credentials-id",
          clientSecret: "client-credentials-secret",
          scopes: "api:read api:write",
          token: "client_credentials_token",
          clientAuthentication: "AS_BASIC_AUTH_HEADERS",
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer client_credentials_token",
        description: "",
      })
    })

    test("handles Password grant type", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "PASSWORD",
          authEndpoint: "https://auth.example.com/oauth/token",
          clientID: "password-client-id",
          clientSecret: "password-client-secret",
          scopes: "user:profile",
          username: "testuser",
          password: "testpass",
          token: "password_grant_token",
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer password_grant_token",
        description: "",
      })
    })

    test("handles Implicit grant type", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "IMPLICIT",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          clientID: "implicit-client-id",
          scopes: "read",
          token: "implicit_token_123",
          authRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer implicit_token_123",
        description: "",
      })
    })

    test("handles template variables in token", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "<<CLIENT_ID>>",
          clientSecret: "<<CLIENT_SECRET>>",
          scopes: "read write",
          token: "<<OAUTH_TOKEN>>",
          isPKCE: false,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe("Bearer oauth2_access_token_123")
    })

    test("handles empty token", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "client-id",
          clientSecret: "client-secret",
          scopes: "read",
          token: "",
          isPKCE: false,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe("Bearer ")
    })
  })
})
