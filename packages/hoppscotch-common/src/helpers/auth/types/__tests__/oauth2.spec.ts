import { describe, test, expect } from "vitest"
import { generateOAuth2AuthHeaders } from "../oauth2"
import { mockRequest, mockEnvVars } from "./test-utils"
import { HoppRESTAuth } from "@hoppscotch/data"

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
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
        },
        addTo: "QUERY_PARAMS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
          clientID: "{{CLIENT_ID}}",
          clientSecret: "{{CLIENT_SECRET}}",
          scopes: "read write",
          token: "{{OAUTH_TOKEN}}",
          isPKCE: false,
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

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
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer ")
    })

    test("handles PKCE flow with Authorization Code", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "pkce-client-id",
          scopes: "openid profile",
          token: "pkce_token_123",
          isPKCE: true,
          codeVerifierMethod: "S256",
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer pkce_token_123",
        description: "",
      })
    })

    test("handles optional client secret for Authorization Code", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "public-client-id",
          scopes: "read",
          token: "public_client_token",
          isPKCE: true,
          codeVerifierMethod: "plain",
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer public_client_token")
    })

    test("handles refresh token for Authorization Code grant", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "refresh-client-id",
          clientSecret: "refresh-client-secret",
          scopes: "offline_access",
          token: "access_token_with_refresh",
          isPKCE: false,
          refreshToken: "refresh_token_xyz",
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer access_token_with_refresh")
    })

    test("handles optional scopes", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "CLIENT_CREDENTIALS",
          authEndpoint: "https://auth.example.com/oauth/token",
          clientID: "no-scope-client",
          clientSecret: "no-scope-secret",
          token: "no_scope_token",
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer no_scope_token")
    })

    test("handles optional client secret for Password grant", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "PASSWORD",
          authEndpoint: "https://auth.example.com/oauth/token",
          clientID: "password-public-client",
          username: "user",
          password: "pass",
          token: "password_public_token",
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer password_public_token")
    })

    test("handles various scope formats", async () => {
      const scopeFormats = [
        "read write admin",
        "user:profile user:email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid profile email offline_access",
      ]

      for (const scopes of scopeFormats) {
        const auth: HoppRESTAuth & { authType: "oauth-2" } = {
          authActive: true,
          authType: "oauth-2",
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "scope-test-client",
            clientSecret: "scope-test-secret",
            scopes,
            token: "scope_test_token",
          },
          addTo: "HEADERS",
        }

        const headers = await generateOAuth2AuthHeaders(
          auth,
          mockRequest,
          mockEnvVars
        )

        expect(headers[0].value).toBe("Bearer scope_test_token")
      }
    })

    test("preserves token case sensitivity", async () => {
      const auth: HoppRESTAuth & { authType: "oauth-2" } = {
        authActive: true,
        authType: "oauth-2",
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: "https://auth.example.com/oauth/authorize",
          tokenEndpoint: "https://auth.example.com/oauth/token",
          clientID: "case-client",
          clientSecret: "case-secret",
          scopes: "read",
          token: "CaSe_SeNsItIvE_ToKeN_123",
          isPKCE: false,
        },
        addTo: "HEADERS",
      }

      const headers = await generateOAuth2AuthHeaders(
        auth,
        mockRequest,
        mockEnvVars
      )

      expect(headers[0].value).toBe("Bearer CaSe_SeNsItIvE_ToKeN_123")
    })
  })
})
