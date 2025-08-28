import { HoppRESTAuth } from "@hoppscotch/data"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { generateJwtAuthHeaders } from "../jwt"
import { mockEnvVars } from "./test-utils"

// Mock the jwt helper
vi.mock("@hoppscotch/data", async () => {
  const actual = await vi.importActual("@hoppscotch/data")
  return {
    ...actual,
    generateJWTToken: vi.fn(),
  }
})

import { generateJWTToken } from "@hoppscotch/data"

describe("JWT Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateJwtAuthHeaders", () => {
    test("generates JWT auth header with basic configuration", async () => {
      const mockToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "my-secret-key",
        privateKey: "",
        algorithm: "HS256",
        payload: '{"sub": "1234567890", "name": "John Doe"}',
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "Bearer ",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(generateJWTToken).toHaveBeenCalledWith({
        secret: "my-secret-key",
        algorithm: "HS256",
        payload: '{"sub": "1234567890", "name": "John Doe"}',
        isSecretBase64Encoded: false,
        privateKey: "",
        jwtHeaders: "{}",
      })

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        description: "",
      })
    })

    test("adds JWT token to query params when addTo is QUERY_PARAMS", async () => {
      const mockToken = "jwt.token.here"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "secret",
        privateKey: "",
        algorithm: "HS256",
        payload: "{}",
        addTo: "QUERY_PARAMS",
        isSecretBase64Encoded: false,
        headerPrefix: "Bearer ",
        paramName: "access_token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(0)
      // Note: Query params would be handled differently in the actual implementation
    })

    test("handles template variables in secret", async () => {
      const mockToken = "generated.jwt.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "<<JWT_SECRET>>",
        privateKey: "",
        algorithm: "HS256",
        payload: "<<JWT_PAYLOAD>>",
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "Bearer ",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(generateJWTToken).toHaveBeenCalledWith({
        secret: "my-secret-key",
        algorithm: "HS256",
        payload: '{"sub": "1234567890", "name": "John Doe"}',
        isSecretBase64Encoded: false,
        privateKey: "",
        jwtHeaders: "{}",
      })

      expect(headers[0].value).toBe("Bearer generated.jwt.token")
    })

    test("handles RSA algorithm with private key", async () => {
      const mockToken = "rsa.signed.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4...",
        algorithm: "RS256",
        payload: '{"iss": "test"}',
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "JWT ",
        paramName: "token",
        jwtHeaders: '{"typ": "JWT"}',
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(generateJWTToken).toHaveBeenCalledWith({
        secret: "",
        algorithm: "RS256",
        payload: '{"iss": "test"}',
        isSecretBase64Encoded: false,
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4...",
        jwtHeaders: '{"typ": "JWT"}',
      })

      expect(headers[0].value).toBe("JWT rsa.signed.token")
    })

    test("handles base64 encoded secret", async () => {
      const mockToken = "base64.encoded.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "bXktc2VjcmV0LWtleQ==", // base64 for "my-secret-key"
        privateKey: "",
        algorithm: "HS512",
        payload: "{}",
        addTo: "HEADERS",
        isSecretBase64Encoded: true,
        headerPrefix: "Token ",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(generateJWTToken).toHaveBeenCalledWith({
        secret: "bXktc2VjcmV0LWtleQ==",
        algorithm: "HS512",
        payload: "{}",
        isSecretBase64Encoded: true,
        privateKey: "",
        jwtHeaders: "{}",
      })

      expect(headers[0].value).toBe("Token base64.encoded.token")
    })

    test("handles custom header prefix", async () => {
      const mockToken = "custom.prefix.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "secret",
        privateKey: "",
        algorithm: "HS256",
        payload: "{}",
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "Custom-Auth ",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe("Custom-Auth custom.prefix.token")
    })

    test("handles empty header prefix", async () => {
      const mockToken = "no.prefix.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "secret",
        privateKey: "",
        algorithm: "HS256",
        payload: "{}",
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe("no.prefix.token")
    })

    test("handles JWT generation failure", async () => {
      vi.mocked(generateJWTToken).mockResolvedValue(null)

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "",
        privateKey: "",
        algorithm: "HS256",
        payload: "{}",
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "Bearer ",
        paramName: "token",
        jwtHeaders: "{}",
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(0)
    })

    test("handles different JWT algorithms", async () => {
      const algorithms = ["HS384", "RS384", "PS256", "ES256"] as const

      for (const algorithm of algorithms) {
        const mockToken = `${algorithm.toLowerCase()}.token`
        vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

        const auth: HoppRESTAuth & { authType: "jwt" } = {
          authActive: true,
          authType: "jwt",
          secret: "secret",
          privateKey: algorithm.startsWith("HS") ? "" : "private-key",
          algorithm,
          payload: "{}",
          addTo: "HEADERS",
          isSecretBase64Encoded: false,
          headerPrefix: "Bearer ",
          paramName: "token",
          jwtHeaders: "{}",
        }

        const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

        expect(generateJWTToken).toHaveBeenCalledWith({
          secret: "secret",
          algorithm,
          payload: "{}",
          isSecretBase64Encoded: false,
          privateKey: algorithm.startsWith("HS") ? "" : "private-key",
          jwtHeaders: "{}",
        })

        expect(headers[0].value).toBe(`Bearer ${mockToken}`)
        vi.clearAllMocks()
      }
    })

    test("handles complex payload with claims", async () => {
      const mockToken = "complex.payload.token"
      vi.mocked(generateJWTToken).mockResolvedValue(mockToken)

      const complexPayload = JSON.stringify({
        iss: "https://example.com",
        sub: "user123",
        aud: "api.example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: "unique-id",
        custom_claim: "custom_value",
      })

      const auth: HoppRESTAuth & { authType: "jwt" } = {
        authActive: true,
        authType: "jwt",
        secret: "secret",
        privateKey: "",
        algorithm: "HS256",
        payload: complexPayload,
        addTo: "HEADERS",
        isSecretBase64Encoded: false,
        headerPrefix: "Bearer ",
        paramName: "token",
        jwtHeaders: '{"alg": "HS256", "typ": "JWT", "kid": "key-id"}',
      }

      const headers = await generateJwtAuthHeaders(auth, mockEnvVars)

      expect(generateJWTToken).toHaveBeenCalledWith({
        secret: "secret",
        algorithm: "HS256",
        payload: complexPayload,
        isSecretBase64Encoded: false,
        privateKey: "",
        jwtHeaders: '{"alg": "HS256", "typ": "JWT", "kid": "key-id"}',
      })

      expect(headers[0].value).toBe("Bearer complex.payload.token")
    })
  })
})
