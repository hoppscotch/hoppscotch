import { describe, test, expect, vi, beforeEach } from "vitest"
import { generateDigestAuthHeaders } from "../digest"
import { createBaseRequest, mockEnvVars } from "./test-utils"
import { HoppRESTAuth } from "@hoppscotch/data"

// Mock the digest helper functions
vi.mock("~/helpers/auth/digest", () => ({
  generateDigestAuthHeader: vi.fn(),
  fetchInitialDigestAuthInfo: vi.fn(),
}))

import {
  generateDigestAuthHeader,
  fetchInitialDigestAuthInfo,
} from "~/helpers/auth/digest"

describe("Digest Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up default mocks for fetchInitialDigestAuthInfo
    vi.mocked(fetchInitialDigestAuthInfo).mockResolvedValue({
      realm: "Default Realm",
      nonce: "default-nonce",
      qop: "auth",
      algorithm: "MD5",
      opaque: "",
    })
  })

  describe("generateDigestAuthHeaders", () => {
    test("generates digest auth header with basic configuration", async () => {
      const mockDigestInfo = {
        realm: "Protected Area",
        nonce: "abc123",
        qop: "auth",
        algorithm: "MD5",
        nc: "00000001",
        cnonce: "",
        opaque: "",
      }

      const mockDigestHeader =
        'Digest username="testuser", realm="Protected Area", nonce="abc123", uri="/api/data", algorithm="MD5", response="def456", qop=auth, nc=00000001, cnonce="xyz789"'

      vi.mocked(fetchInitialDigestAuthInfo).mockResolvedValue(mockDigestInfo)
      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "testuser",
        password: "testpass",
        realm: "Protected Area",
        nonce: "abc123",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "testuser",
        password: "testpass",
        realm: "Protected Area",
        nonce: "abc123",
        endpoint: "https://api.example.com/data",
        method: "GET",
        algorithm: "MD5",
        qop: "auth",
        opaque: "",
        reqBody: "",
      })

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: mockDigestHeader,
        description: "",
      })
    })

    test("handles MD5-sess algorithm", async () => {
      const mockDigestInfo = {
        realm: "Test",
        nonce: "nonce123",
        qop: "auth",
        algorithm: "MD5-sess",
        nc: "00000001",
        cnonce: "",
        opaque: "",
      }

      const mockDigestHeader =
        'Digest username="user", realm="Test", nonce="nonce123", uri="/api", algorithm="MD5-sess", response="response456", qop=auth, nc=00000001, cnonce="client789"'

      vi.mocked(fetchInitialDigestAuthInfo).mockResolvedValue(mockDigestInfo)
      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "Test",
        nonce: "nonce123",
        algorithm: "MD5-sess",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "user",
        password: "pass",
        realm: "Test",
        nonce: "nonce123",
        endpoint: "https://api.example.com/data",
        method: "GET",
        algorithm: "MD5-sess",
        qop: "auth",
        opaque: "",
        reqBody: "",
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles auth-int qop with request body", async () => {
      const mockDigestHeader =
        'Digest username="user", realm="Protected", nonce="nonce456", uri="/api/update", algorithm="MD5", response="response789", qop=auth-int, nc=00000001, cnonce="client123"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const requestWithBody = createBaseRequest({
        method: "POST",
        body: {
          contentType: "application/json" as const,
          body: '{"name": "test", "value": 123}',
        },
      })

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "Protected",
        nonce: "nonce456",
        algorithm: "MD5",
        qop: "auth-int",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        requestWithBody,
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "user",
        password: "pass",
        realm: "Protected",
        nonce: "nonce456",
        endpoint: "https://api.example.com/data",
        method: "POST",
        algorithm: "MD5",
        qop: "auth-int",
        opaque: "",
        reqBody: '{"name": "test", "value": 123}',
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles template variables in username and password", async () => {
      const mockDigestHeader =
        'Digest username="testuser", realm="realm", nonce="nonce", uri="/api/data", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "<<DIGEST_USER>>",
        password: "<<DIGEST_PASS>>",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "testuser",
        password: "testpass",
        realm: "realm",
        nonce: "nonce",
        endpoint: "https://api.example.com/data",
        method: "GET",
        algorithm: "MD5",
        qop: "auth",
        opaque: "",
        reqBody: "",
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles opaque value", async () => {
      const mockDigestHeader =
        'Digest username="user", realm="Protected", nonce="nonce123", uri="/api/data", algorithm="MD5", response="response456", qop=auth, nc=00000001, cnonce="cnonce789", opaque="opaque-value-123"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "Protected",
        nonce: "nonce123",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "cnonce789",
        opaque: "opaque-value-123",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "user",
        password: "pass",
        realm: "Protected",
        nonce: "nonce123",
        endpoint: "https://api.example.com/data",
        method: "GET",
        algorithm: "MD5",
        qop: "auth",
        opaque: "opaque-value-123",
        reqBody: "",
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("auto-generates cnonce when not provided", async () => {
      const mockDigestHeader =
        'Digest username="user", realm="realm", nonce="nonce", uri="/api/data", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="auto-generated"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        endpoint: "https://api.example.com/data",
        method: "GET",
        algorithm: "MD5",
        qop: "auth",
        opaque: "",
        reqBody: "",
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles initial digest auth info fetch", async () => {
      const mockDigestInfo = {
        realm: "Fetched Realm",
        nonce: "fetched-nonce-123",
        qop: "auth",
        algorithm: "MD5",
        opaque: "fetched-opaque",
      }

      const mockDigestHeader =
        'Digest username="user", realm="Fetched Realm", nonce="fetched-nonce-123", uri="/api/data", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"'

      vi.mocked(fetchInitialDigestAuthInfo).mockResolvedValue(mockDigestInfo)
      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "", // Empty realm should trigger fetch
        nonce: "",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(fetchInitialDigestAuthInfo).toHaveBeenCalledWith(
        "https://api.example.com/data",
        "GET"
      )

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles empty credentials", async () => {
      const mockDigestHeader =
        'Digest username="", realm="realm", nonce="nonce", uri="/api/data", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "",
        password: "",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(headers[0].value).toBe(mockDigestHeader)
    })

    test("handles digest auth generation failure", async () => {
      vi.mocked(generateDigestAuthHeader).mockResolvedValue("")

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(headers).toHaveLength(1)
      expect(headers[0].value).toBe("")
    })

    test("handles different HTTP methods", async () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]

      for (const method of methods) {
        const mockDigestHeader = `Digest username="user", realm="realm", nonce="nonce", uri="/api/data", algorithm="MD5", response="response-${method}", qop=auth, nc=00000001, cnonce="cnonce"`

        vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

        const requestWithMethod = createBaseRequest({
          method,
        })

        const auth: HoppRESTAuth & { authType: "digest" } = {
          authActive: true,
          authType: "digest",
          username: "user",
          password: "pass",
          realm: "realm",
          nonce: "nonce",
          algorithm: "MD5",
          qop: "auth",
          nc: "00000001",
          cnonce: "",
          opaque: "",
          disableRetry: false,
        }

        const headers = await generateDigestAuthHeaders(
          auth,
          requestWithMethod,
          mockEnvVars
        )

        expect(generateDigestAuthHeader).toHaveBeenCalledWith({
          username: "user",
          password: "pass",
          realm: "realm",
          nonce: "nonce",
          endpoint: "https://api.example.com/data",
          method,
          algorithm: "MD5",
          qop: "auth",
          opaque: "",
          reqBody: "",
        })

        expect(headers[0].value).toBe(mockDigestHeader)
        vi.clearAllMocks()
      }
    })

    test("handles disable retry flag", async () => {
      const mockDigestHeader =
        'Digest username="user", realm="realm", nonce="nonce", uri="/api/data", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: true,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(headers[0].value).toBe(mockDigestHeader)
      // The disableRetry flag would be used in the actual digest auth flow
    })

    test("handles complex URI paths with query parameters", async () => {
      const mockDigestHeader =
        'Digest username="user", realm="realm", nonce="nonce", uri="/api/data?param=value&other=test", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"'

      vi.mocked(generateDigestAuthHeader).mockResolvedValue(mockDigestHeader)

      const requestWithQueryParams = createBaseRequest({
        endpoint: "https://api.example.com/api/data?param=value&other=test",
      })

      const auth: HoppRESTAuth & { authType: "digest" } = {
        authActive: true,
        authType: "digest",
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        algorithm: "MD5",
        qop: "auth",
        nc: "00000001",
        cnonce: "",
        opaque: "",
        disableRetry: false,
      }

      const headers = await generateDigestAuthHeaders(
        auth,
        requestWithQueryParams,
        mockEnvVars
      )

      expect(generateDigestAuthHeader).toHaveBeenCalledWith({
        username: "user",
        password: "pass",
        realm: "realm",
        nonce: "nonce",
        endpoint: "https://api.example.com/api/data?param=value&other=test",
        method: "GET",
        algorithm: "MD5",
        qop: "auth",
        opaque: "",
        reqBody: "",
      })

      expect(headers[0].value).toBe(mockDigestHeader)
    })
  })
})
