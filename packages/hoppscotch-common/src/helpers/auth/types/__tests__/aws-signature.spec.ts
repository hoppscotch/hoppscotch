import { HoppRESTAuth } from "@hoppscotch/data"
import { beforeEach, describe, expect, test, vi } from "vitest"
import {
  generateAwsSignatureAuthHeaders,
  generateAwsSignatureAuthParams,
} from "../aws-signature"
import { mockEnvVars, mockRequest } from "./test-utils"

// Mock the AwsV4Signer
vi.mock("aws4fetch", () => ({
  AwsV4Signer: vi.fn(),
}))

const { AwsV4Signer } = await import("aws4fetch")

describe("AWS Signature Auth", () => {
  const awsMockRequest = mockRequest

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateAwsSignatureAuthHeaders", () => {
    test("generates AWS signature headers when addTo is HEADERS", async () => {
      const mockSign = vi.fn().mockResolvedValue({
        headers: new Map([
          ["Authorization", "AWS4-HMAC-SHA256 Credential=..."],
          ["x-amz-date", "20230101T000000Z"],
        ]),
      })

      vi.mocked(AwsV4Signer).mockImplementation(
        () =>
          ({
            sign: mockSign,
          }) as any
      )

      const auth: HoppRESTAuth & { authType: "aws-signature" } = {
        authActive: true,
        authType: "aws-signature",
        addTo: "HEADERS",
        accessKey: "{{AWS_ACCESS_KEY}}",
        secretKey: "{{AWS_SECRET_KEY}}",
        region: "{{AWS_REGION}}",
        serviceName: "s3",
      }

      const headers = await generateAwsSignatureAuthHeaders(
        auth,
        awsMockRequest,
        mockEnvVars
      )

      expect(headers).toHaveLength(2)
      expect(headers).toEqual([
        {
          active: true,
          key: "Authorization",
          value: "AWS4-HMAC-SHA256 Credential=...",
          description: "",
        },
        {
          active: true,
          key: "x-amz-date",
          value: "20230101T000000Z",
          description: "",
        },
      ])
    })

    test("returns empty array when addTo is not HEADERS", async () => {
      const auth: HoppRESTAuth & { authType: "aws-signature" } = {
        authActive: true,
        authType: "aws-signature",
        addTo: "QUERY_PARAMS",
        accessKey: "key",
        secretKey: "secret",
        region: "us-east-1",
        serviceName: "s3",
      }

      const headers = await generateAwsSignatureAuthHeaders(
        auth,
        awsMockRequest,
        mockEnvVars
      )

      expect(headers).toHaveLength(0)
    })
  })

  describe("generateAwsSignatureAuthParams", () => {
    test("generates AWS signature params when addTo is QUERY_PARAMS", async () => {
      const mockSign = vi.fn().mockResolvedValue({
        url: new URL(
          "https://s3.amazonaws.com/bucket/object?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test"
        ),
      })

      vi.mocked(AwsV4Signer).mockImplementation(
        () =>
          ({
            sign: mockSign,
          }) as any
      )

      const auth: HoppRESTAuth & { authType: "aws-signature" } = {
        authActive: true,
        authType: "aws-signature",
        addTo: "QUERY_PARAMS",
        accessKey: "{{AWS_ACCESS_KEY}}",
        secretKey: "{{AWS_SECRET_KEY}}",
        region: "{{AWS_REGION}}",
        serviceName: "s3",
      }

      const params = await generateAwsSignatureAuthParams(
        auth,
        awsMockRequest,
        mockEnvVars
      )

      expect(params).toHaveLength(2)
      expect(params).toEqual([
        {
          active: true,
          key: "X-Amz-Algorithm",
          value: "AWS4-HMAC-SHA256",
          description: "",
        },
        {
          active: true,
          key: "X-Amz-Credential",
          value: "test",
          description: "",
        },
      ])
    })

    test("returns empty array when addTo is not QUERY_PARAMS", async () => {
      const auth: HoppRESTAuth & { authType: "aws-signature" } = {
        authActive: true,
        authType: "aws-signature",
        addTo: "HEADERS",
        accessKey: "key",
        secretKey: "secret",
        region: "us-east-1",
        serviceName: "s3",
      }

      const params = await generateAwsSignatureAuthParams(
        auth,
        awsMockRequest,
        mockEnvVars
      )

      expect(params).toHaveLength(0)
    })
  })
})
