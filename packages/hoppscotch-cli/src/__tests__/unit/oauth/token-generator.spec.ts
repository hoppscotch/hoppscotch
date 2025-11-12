import { describe, expect, test, vi, beforeEach } from "vitest"
import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import axios from "axios"
import {
  generateOAuth2TokenForCollection,
  hasOAuth2Auth,
  requiresRedirect,
  updateCollectionWithToken,
} from "../../../utils/oauth/token-generator"

// Mock axios
vi.mock("axios")

describe("CLI OAuth Token Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("hasOAuth2Auth", () => {
    test("returns true when collection has active OAuth 2.0 auth", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            clientAuthentication: "AS_BASIC_AUTH_HEADERS",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
            scopes: "read",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      expect(hasOAuth2Auth(collection)).toBe(true)
    })

    test("returns false when collection has no auth", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "none",
          authActive: false,
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      expect(hasOAuth2Auth(collection)).toBe(false)
    })

    test("returns false when OAuth auth is inactive", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: false,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            clientAuthentication: "AS_BASIC_AUTH_HEADERS",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      expect(hasOAuth2Auth(collection)).toBe(false)
    })
  })

  describe("requiresRedirect", () => {
    test("returns true for AUTHORIZATION_CODE grant type", () => {
      const auth = {
        authType: "oauth-2" as const,
        authActive: true,
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE" as const,
          token: "",
          clientID: "client-id",
          authEndpoint: "https://auth.example.com/authorize",
          tokenEndpoint: "https://auth.example.com/token",
          isPKCE: false,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
          clientSecret: "secret",
        },
        addTo: "HEADERS" as const,
      }

      expect(requiresRedirect(auth)).toBe(true)
    })

    test("returns true for IMPLICIT grant type", () => {
      const auth = {
        authType: "oauth-2" as const,
        authActive: true,
        grantTypeInfo: {
          grantType: "IMPLICIT" as const,
          token: "",
          clientID: "client-id",
          authEndpoint: "https://auth.example.com/authorize",
          authRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS" as const,
      }

      expect(requiresRedirect(auth)).toBe(true)
    })

    test("returns false for CLIENT_CREDENTIALS grant type", () => {
      const auth = {
        authType: "oauth-2" as const,
        authActive: true,
        grantTypeInfo: {
          grantType: "CLIENT_CREDENTIALS" as const,
          token: "",
          clientID: "client-id",
          authEndpoint: "https://auth.example.com/token",
          clientAuthentication: "AS_BASIC_AUTH_HEADERS" as const,
          tokenRequestParams: [],
          refreshRequestParams: [],
          clientSecret: "secret",
        },
        addTo: "HEADERS" as const,
      }

      expect(requiresRedirect(auth)).toBe(false)
    })

    test("returns false for PASSWORD grant type", () => {
      const auth = {
        authType: "oauth-2" as const,
        authActive: true,
        grantTypeInfo: {
          grantType: "PASSWORD" as const,
          token: "",
          clientID: "client-id",
          username: "user",
          password: "pass",
          authEndpoint: "https://auth.example.com/token",
          tokenRequestParams: [],
          refreshRequestParams: [],
          clientSecret: "secret",
        },
        addTo: "HEADERS" as const,
      }

      expect(requiresRedirect(auth)).toBe(false)
    })
  })

  describe("generateOAuth2TokenForCollection", () => {
    test("returns NO_OAUTH_CONFIG when collection has no OAuth auth", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "none",
          authActive: false,
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      const result = await generateOAuth2TokenForCollection(collection)

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left).toBe("NO_OAUTH_CONFIG")
      }
    })

    test("returns REDIRECT_GRANT_TYPE_NOT_SUPPORTED for AUTHORIZATION_CODE", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "AUTHORIZATION_CODE",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/authorize",
            tokenEndpoint: "https://auth.example.com/token",
            isPKCE: false,
            authRequestParams: [],
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      const result = await generateOAuth2TokenForCollection(collection)

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left).toBe("REDIRECT_GRANT_TYPE_NOT_SUPPORTED")
      }
    })

    test("generates token successfully for CLIENT_CREDENTIALS grant type", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            clientAuthentication: "IN_BODY",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
            scopes: "read write",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      // Mock axios response
      const mockResponse = {
        data: {
          access_token: "mock-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        },
      }

      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      const result = await generateOAuth2TokenForCollection(collection)

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right.access_token).toBe("mock-access-token")
        expect(result.right.token_type).toBe("Bearer")
        expect(result.right.expires_in).toBe(3600)
      }

      // Verify axios was called with correct parameters
      expect(axios.post).toHaveBeenCalledWith(
        "https://auth.example.com/token",
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      )
    })

    test("generates token successfully for PASSWORD grant type", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "PASSWORD",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
            username: "testuser",
            password: "testpass",
            scopes: "read write",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      // Mock axios response
      const mockResponse = {
        data: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        },
      }

      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      const result = await generateOAuth2TokenForCollection(collection)

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right.access_token).toBe("mock-access-token")
        expect(result.right.refresh_token).toBe("mock-refresh-token")
      }
    })

    test("returns TOKEN_GENERATION_FAILED when axios request fails", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            clientAuthentication: "IN_BODY",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      vi.mocked(axios.post).mockRejectedValue(new Error("Network error"))

      const result = await generateOAuth2TokenForCollection(collection)

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left).toBe("TOKEN_GENERATION_FAILED")
      }
    })
  })

  describe("updateCollectionWithToken", () => {
    test("updates collection OAuth token with access token", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            token: "",
            clientID: "client-id",
            authEndpoint: "https://auth.example.com/token",
            clientAuthentication: "AS_BASIC_AUTH_HEADERS",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      updateCollectionWithToken(collection, "new-access-token")

      expect(collection.auth.authType).toBe("oauth-2")
      if (collection.auth.authType === "oauth-2") {
        expect(collection.auth.grantTypeInfo.token).toBe("new-access-token")
      }
    })

    test("updates collection OAuth token with access and refresh tokens for PASSWORD", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "PASSWORD",
            token: "",
            clientID: "client-id",
            username: "user",
            password: "pass",
            authEndpoint: "https://auth.example.com/token",
            tokenRequestParams: [],
            refreshRequestParams: [],
            clientSecret: "secret",
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      updateCollectionWithToken(
        collection,
        "new-access-token",
        "new-refresh-token"
      )

      expect(collection.auth.authType).toBe("oauth-2")
      if (collection.auth.authType === "oauth-2") {
        expect(collection.auth.grantTypeInfo.token).toBe("new-access-token")
        if (collection.auth.grantTypeInfo.grantType === "PASSWORD") {
          expect((collection.auth.grantTypeInfo as any).refreshToken).toBe(
            "new-refresh-token"
          )
        }
      }
    })

    test("does not update collection if auth is not OAuth 2.0", () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test",
        name: "Test",
        auth: {
          authType: "bearer",
          authActive: true,
          token: "original-token",
        },
        headers: [],
        folders: [],
        requests: [],
        variables: [],
      }

      updateCollectionWithToken(collection, "new-access-token")

      expect(collection.auth.authType).toBe("bearer")
      if (collection.auth.authType === "bearer") {
        expect(collection.auth.token).toBe("original-token")
      }
    })
  })
})
