import type { Environment, HoppRESTAuth } from "@hoppscotch/data"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  generateAwsSignatureAuthHeaders,
  generateAwsSignatureAuthParams,
} from "../aws-signature"
import { createBaseRequest } from "./test-utils"

vi.mock("aws4fetch", () => ({
  AwsV4Signer: vi.fn().mockImplementation((config) => ({
    sign: vi.fn().mockResolvedValue({
      headers: new Map([
        [
          "Authorization",
          "AWS4-HMAC-SHA256 Credential=test-key/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=test-signature",
        ],
        ["X-Amz-Date", "20240101T120000Z"],
        ["Host", "s3.amazonaws.com"],
      ]),
      url: new URL(config.url),
    }),
  })),
}))

vi.mock("~/helpers/utils/EffectiveURL", () => ({
  getFinalBodyFromRequest: vi.fn().mockReturnValue("test body"),
}))

describe("AWS Signature Auth", () => {
  const mockEnvVars: Environment["variables"] = [
    {
      key: "AWS_ACCESS_KEY",
      secret: false,
      initialValue: "test-access-key",
      currentValue: "test-access-key",
    },
    {
      key: "AWS_SECRET_KEY",
      secret: true,
      initialValue: "test-secret-key",
      currentValue: "test-secret-key",
    },
    {
      key: "AWS_REGION",
      secret: false,
      initialValue: "us-east-1",
      currentValue: "us-east-1",
    },
    {
      key: "AWS_SERVICE",
      secret: false,
      initialValue: "s3",
      currentValue: "s3",
    },
  ]

  // Helper function to create base auth configuration
  const createBaseAuth = (
    overrides: Partial<HoppRESTAuth & { authType: "aws-signature" }> = {}
  ): HoppRESTAuth & { authType: "aws-signature" } => ({
    authType: "aws-signature",
    authActive: true,
    addTo: "HEADERS",
    accessKey: "test-access-key",
    secretKey: "test-secret-key",
    region: "us-east-1",
    serviceName: "s3",
    serviceToken: "",
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("generateAwsSignatureAuthHeaders", () => {
    test("should return empty array when addTo is not HEADERS", async () => {
      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toEqual([])
    })

    test("should generate AWS signature headers correctly", async () => {
      const auth = createBaseAuth() // uses default HEADERS addTo
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )

      expect(result).toHaveLength(3)
      expect(result).toEqual([
        {
          active: true,
          key: "Authorization",
          value:
            "AWS4-HMAC-SHA256 Credential=test-key/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=test-signature",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-Date",
          value: "20240101T120000Z",
          description: "",
        },
        {
          active: true,
          key: "Host",
          value: "s3.amazonaws.com",
          description: "",
        },
      ])
    })

    test("should parse template strings for auth parameters", async () => {
      const auth = createBaseAuth({
        accessKey: "<<AWS_ACCESS_KEY>>",
        secretKey: "<<AWS_SECRET_KEY>>",
        region: "<<AWS_REGION>>",
        serviceName: "<<AWS_SERVICE>>",
      })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toHaveLength(3)
    })

    test("should handle request parameters and sort them alphabetically", async () => {
      const auth = createBaseAuth()
      const request = createBaseRequest({
        params: [
          { active: true, key: "z-param", value: "value1", description: "" },
          { active: true, key: "a-param", value: "value2", description: "" },
          { active: false, key: "inactive", value: "value3", description: "" },
          { active: true, key: "", value: "empty-key", description: "" },
        ],
      })

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toHaveLength(3)
    })

    test("should handle session token when provided", async () => {
      const auth = createBaseAuth({ serviceToken: "test-session-token" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toHaveLength(3)
    })

    test("should default to us-east-1 region when region is empty", async () => {
      const auth = createBaseAuth({ region: "" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthHeaders(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toHaveLength(3)
    })
  })

  describe("generateAwsSignatureAuthParams", () => {
    test("should return empty array when addTo is not QUERY_PARAMS", async () => {
      const auth = createBaseAuth({ addTo: "HEADERS" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toEqual([])
    })

    test("should generate AWS signature query parameters correctly", async () => {
      const { AwsV4Signer } = await import("aws4fetch")
      vi.mocked(AwsV4Signer).mockImplementation(
        (config) =>
          ({
            sign: vi.fn().mockResolvedValue({
              headers: new Map(),
              url: new URL(
                config.url +
                  "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test-key%2F20240101%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240101T120000Z&X-Amz-SignedHeaders=host&X-Amz-Signature=test-signature"
              ),
            }),
          }) as any
      )

      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        mockEnvVars
      )

      expect(result).toHaveLength(5)
      expect(result).toEqual([
        {
          active: true,
          key: "X-Amz-Algorithm",
          value: "AWS4-HMAC-SHA256",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-Credential",
          value: "test-key/20240101/us-east-1/s3/aws4_request",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-Date",
          value: "20240101T120000Z",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-SignedHeaders",
          value: "host",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-Signature",
          value: "test-signature",
          description: "",
        },
      ])
    })

    test("should exclude original request parameters from result", async () => {
      const { AwsV4Signer } = await import("aws4fetch")
      vi.mocked(AwsV4Signer).mockImplementation(
        (config) =>
          ({
            sign: vi.fn().mockResolvedValue({
              headers: new Map(),
              url: new URL(
                config.url +
                  "?original-param=value&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test-signature"
              ),
            }),
          }) as any
      )

      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })
      const request = createBaseRequest({
        params: [
          {
            active: true,
            key: "original-param",
            value: "value",
            description: "",
          },
        ],
      })

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        mockEnvVars
      )

      // only return AWS signature parameters, not the original parameter
      expect(result).toHaveLength(2)
      expect(result.find((p) => p.key === "original-param")).toBeUndefined()
      expect(result.find((p) => p.key === "X-Amz-Algorithm")).toBeDefined()
      expect(result.find((p) => p.key === "X-Amz-Signature")).toBeDefined()
    })

    test("should handle template strings in endpoint", async () => {
      const { AwsV4Signer } = await import("aws4fetch")
      vi.mocked(AwsV4Signer).mockImplementation(
        (config) =>
          ({
            sign: vi.fn().mockResolvedValue({
              headers: new Map(),
              url: new URL(
                config.url +
                  "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test-signature"
              ),
            }),
          }) as any
      )

      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })

      const envVarsWithHost: Environment["variables"] = [
        ...mockEnvVars,
        {
          key: "HOST",
          secret: false,
          initialValue: "s3.amazonaws.com",
          currentValue: "s3.amazonaws.com",
        },
      ]

      const request = createBaseRequest({
        endpoint: "https://<<HOST>>/bucket/key",
      })

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        envVarsWithHost
      )
      expect(result).toHaveLength(2)
    })

    test("should sort existing parameters alphabetically before signing", async () => {
      const { AwsV4Signer } = await import("aws4fetch")
      vi.mocked(AwsV4Signer).mockImplementation(
        (config) =>
          ({
            sign: vi.fn().mockResolvedValue({
              headers: new Map(),
              url: new URL(
                config.url +
                  "?z-param=value1&a-param=value2&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test-signature"
              ),
            }),
          }) as any
      )

      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })
      const request = createBaseRequest({
        params: [
          { active: true, key: "z-param", value: "value1", description: "" },
          { active: true, key: "a-param", value: "value2", description: "" },
          { active: false, key: "inactive", value: "value3", description: "" },
        ],
      })

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        mockEnvVars
      )

      // exclude original parameters and only return AWS signature parameters
      expect(result).toHaveLength(2)
      expect(result.find((p) => p.key === "z-param")).toBeUndefined()
      expect(result.find((p) => p.key === "a-param")).toBeUndefined()
      expect(result.find((p) => p.key === "inactive")).toBeUndefined()
    })

    test("should handle empty or missing session token", async () => {
      const { AwsV4Signer } = await import("aws4fetch")
      vi.mocked(AwsV4Signer).mockImplementation(
        (config) =>
          ({
            sign: vi.fn().mockResolvedValue({
              headers: new Map(),
              url: new URL(
                config.url +
                  "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test-signature"
              ),
            }),
          }) as any
      )

      const auth = createBaseAuth({ addTo: "QUERY_PARAMS" })
      const request = createBaseRequest()

      const result = await generateAwsSignatureAuthParams(
        auth,
        request,
        mockEnvVars
      )
      expect(result).toHaveLength(2)
    })
  })
})
