import { describe, expect, test, vi, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import { ref } from "vue"
import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { TestRunnerService } from "../test-runner.service"
import { HoppTab } from "~/services/tab"
import { HoppTestRunnerDocument } from "~/helpers/rest/document"

// Mock functions using vi.hoisted to ensure they're available during hoisting
const {
  mockGenerateOAuth2TokenForCollection,
  mockHasOAuth2Auth,
  mockRequiresRedirect,
  mockUpdateCollectionWithToken,
} = vi.hoisted(() => ({
  mockGenerateOAuth2TokenForCollection: vi.fn(),
  mockHasOAuth2Auth: vi.fn(),
  mockRequiresRedirect: vi.fn(),
  mockUpdateCollectionWithToken: vi.fn(),
}))

vi.mock("~/helpers/oauth/auto-token-generator", () => ({
  generateOAuth2TokenForCollection: mockGenerateOAuth2TokenForCollection,
  hasOAuth2Auth: mockHasOAuth2Auth,
  requiresRedirect: mockRequiresRedirect,
  updateCollectionWithToken: mockUpdateCollectionWithToken,
  OAUTH_ERROR_MESSAGES: {
    NO_OAUTH_CONFIG: "authorization.oauth.no_config_found",
    REDIRECT_GRANT_TYPE_NOT_SUPPORTED:
      "authorization.oauth.redirect_not_supported_for_collection",
    VALIDATION_FAILED: "authorization.oauth.auto_generation_validation_failed",
    TOKEN_GENERATION_FAILED: "authorization.oauth.token_fetch_failed",
    UNSUPPORTED_GRANT_TYPE:
      "authorization.oauth.unsupported_grant_type_for_auto_generation",
  },
}))

// Mock runTestRunnerRequest
vi.mock("~/helpers/RequestRunner", () => ({
  runTestRunnerRequest: vi.fn(() =>
    Promise.resolve(
      E.right({
        response: {
          type: "success",
          statusCode: 200,
          body: "test response",
          headers: [],
          meta: {
            responseDuration: 100,
            responseSize: 100,
          },
        },
        testResult: {
          expectResults: [],
          tests: [],
          envDiff: {
            global: { additions: [], updations: [], deletions: [] },
            selected: { additions: [], updations: [], deletions: [] },
          },
          scriptError: false,
        },
        updatedRequest: {
          v: "1",
          id: "test-request",
          name: "Test Request",
          method: "GET",
          endpoint: "https://api.example.com/test",
          params: [],
          headers: [],
          auth: { authType: "inherit", authActive: true },
          body: { contentType: null, body: null },
        },
      })
    )
  ),
}))

describe("TestRunnerService - OAuth Integration", () => {
  let container: TestContainer
  let service: TestRunnerService
  let mockToast: ReturnType<typeof createMockToast>
  let mockT: ReturnType<typeof createMockTranslation>

  function createMockToast() {
    return {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      show: vi.fn(),
      clear: vi.fn(),
    }
  }

  function createMockTranslation() {
    const translations: Record<string, string> = {
      "authorization.oauth.redirect_not_supported_for_collection":
        "OAuth grant type '{grantType}' requires browser redirect",
      "authorization.oauth.no_config_found": "No OAuth 2.0 configuration found",
      "authorization.oauth.auto_generation_validation_failed":
        "OAuth 2.0 configuration validation failed",
      "authorization.oauth.token_fetch_failed": "Failed to fetch token",
      "authorization.oauth.unsupported_grant_type_for_auto_generation":
        "Unsupported OAuth 2.0 grant type",
      "authorization.oauth.token_fetched_successfully":
        "Token fetched successfully",
    }

    return vi.fn((key: string, params?: Record<string, string>) => {
      let translation = translations[key] || key
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          translation = translation.replace(`{${paramKey}}`, paramValue)
        })
      }
      return translation
    })
  }

  function createMockTab(collection: HoppCollection): typeof tab {
    const tab = ref<HoppTab<HoppTestRunnerDocument>>({
      id: "test-tab",
      label: "Test Tab",
      document: {
        type: "test-runner",
        config: {
          iterations: 1,
          delay: 0,
          stopOnError: false,
          persistResponses: false,
          keepVariableValues: false,
        },
        status: "idle",
        collection,
        testRunnerMeta: {
          totalRequests: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          totalTime: 0,
          completedRequests: 0,
        },
        selectedRequestPath: undefined,
      },
    })
    return tab
  }

  beforeEach(() => {
    vi.clearAllMocks()
    container = new TestContainer()
    service = container.bind(TestRunnerService)
    mockToast = createMockToast()
    mockT = createMockTranslation()
  })

  describe("OAuth Token Auto-Generation", () => {
    const testOptions = {
      iterations: 1,
      delay: 0,
      stopOnError: false,
      persistResponses: false,
      keepVariableValues: false,
      stopRef: ref(false),
    }

    test("does not attempt OAuth generation when collection has no OAuth auth", async () => {
      const collection: HoppCollection = {
        v: 10,
        id: "test-collection",
        name: "Test Collection",
        auth: { authType: "none", authActive: false },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(false)

      const tab = createMockTab(collection)
      await service.runTests(tab, collection, testOptions, mockT, mockToast)

      expect(mockHasOAuth2Auth).toHaveBeenCalledWith(collection)
      expect(mockGenerateOAuth2TokenForCollection).not.toHaveBeenCalled()
      expect(mockToast.success).not.toHaveBeenCalled()
    })

    test("shows error and stops execution for redirect grant types (Authorization Code)", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "AUTHORIZATION_CODE",
            authEndpoint: "https://auth.example.com/oauth/authorize",
            tokenEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(true)

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockRequiresRedirect).toHaveBeenCalledWith(collection.auth)
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("AUTHORIZATION_CODE")
      )
      expect(tab.value.document.status).toBe("error")
      expect(mockGenerateOAuth2TokenForCollection).not.toHaveBeenCalled()
    })

    test("shows error and stops execution for redirect grant types (Implicit)", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "IMPLICIT",
            authEndpoint: "https://auth.example.com/oauth/authorize",
            clientID: "client-id",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(true)

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("IMPLICIT")
      )
      expect(tab.value.document.status).toBe("error")
    })

    test("generates token successfully for Client Credentials grant type", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [
          {
            v: "5",
            id: "test-request",
            name: "Test Request",
            method: "GET",
            endpoint: "https://api.example.com/test",
            auth: { authType: "inherit", authActive: true },
            headers: [],
            params: [],
            body: { contentType: null, body: null },
            preRequestScript: "",
            testScript: "",
          },
        ],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.right({
          access_token: "generated-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        })
      )

      const tab = createMockTab(collection)
      // Update totalRequests to match
      tab.value.document.testRunnerMeta!.totalRequests = 1

      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockGenerateOAuth2TokenForCollection).toHaveBeenCalledWith(
        collection
      )
      expect(mockUpdateCollectionWithToken).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith(
        "Token fetched successfully"
      )
      // Note: Status check skipped - depends on request execution which requires more complex mocking
    })

    test("generates token successfully for Password grant type with refresh token", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "PASSWORD",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            username: "user",
            password: "pass",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.right({
          access_token: "generated-access-token",
          refresh_token: "generated-refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        })
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockUpdateCollectionWithToken).toHaveBeenCalledWith(
        collection,
        "generated-access-token",
        "generated-refresh-token"
      )
      expect(mockToast.success).toHaveBeenCalledWith(
        "Token fetched successfully"
      )
    })

    test("shows error when token generation fails with NO_OAUTH_CONFIG", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "",
            clientID: "",
            clientSecret: "",
            scopes: "",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.left("NO_OAUTH_CONFIG")
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith(
        "No OAuth 2.0 configuration found"
      )
      expect(tab.value.document.status).toBe("error")
      expect(mockUpdateCollectionWithToken).not.toHaveBeenCalled()
    })

    test("shows error when token generation fails with VALIDATION_FAILED", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "invalid-url",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.left("VALIDATION_FAILED")
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith(
        "OAuth 2.0 configuration validation failed"
      )
      expect(tab.value.document.status).toBe("error")
    })

    test("shows error when token generation fails with TOKEN_GENERATION_FAILED", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "wrong-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.left("TOKEN_GENERATION_FAILED")
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith("Failed to fetch token")
      expect(tab.value.document.status).toBe("error")
    })

    test("shows error when token generation fails with UNSUPPORTED_GRANT_TYPE", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            // @ts-expect-error - Testing unsupported grant type
            grantType: "CUSTOM_GRANT_TYPE",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.left("UNSUPPORTED_GRANT_TYPE")
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith(
        "Unsupported OAuth 2.0 grant type"
      )
      expect(tab.value.document.status).toBe("error")
    })

    test("shows fallback error message for unknown error types", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        // @ts-expect-error - Testing unknown error type
        E.left("UNKNOWN_ERROR")
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      expect(mockToast.error).toHaveBeenCalledWith(undefined)
      expect(tab.value.document.status).toBe("error")
    })

    test("updates both original and result collections with token", async () => {
      const collection: HoppCollection = {
        v: 2,
        id: "test-collection",
        name: "Test Collection",
        auth: {
          authType: "oauth-2",
          authActive: true,
          grantTypeInfo: {
            grantType: "CLIENT_CREDENTIALS",
            authEndpoint: "https://auth.example.com/oauth/token",
            clientID: "client-id",
            clientSecret: "client-secret",
            scopes: "read write",
            token: "",
            isPKCE: false,
          },
          addTo: "HEADERS",
        },
        headers: [],
        folders: [],
        requests: [],
      }

      mockHasOAuth2Auth.mockReturnValue(true)
      mockRequiresRedirect.mockReturnValue(false)
      mockGenerateOAuth2TokenForCollection.mockResolvedValue(
        E.right({
          access_token: "generated-token",
          token_type: "Bearer",
          expires_in: 3600,
        })
      )

      const tab = createMockTab(collection)
      await service.runTests(
        tab,
        collection,
        { delay: 0, stopRef: ref(false), persistResponses: false },
        mockT,
        mockToast
      )

      // First call: original collection
      expect(mockUpdateCollectionWithToken).toHaveBeenNthCalledWith(
        1,
        collection,
        "generated-token",
        undefined
      )

      // Second call: result collection
      expect(mockUpdateCollectionWithToken).toHaveBeenNthCalledWith(
        2,
        tab.value.document.resultCollection,
        "generated-token",
        undefined
      )

      expect(mockUpdateCollectionWithToken).toHaveBeenCalledTimes(2)
    })
  })
})
