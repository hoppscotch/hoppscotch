import { HoppRESTAuth } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { generateApiKeyAuthHeaders, generateApiKeyAuthParams } from "../api-key"
import { mockEnvVars } from "./test-utils"

describe("API Key Auth", () => {
  describe("generateApiKeyAuthHeaders", () => {
    test("generates headers when addTo is HEADERS", async () => {
      const auth: HoppRESTAuth & { authType: "api-key" } = {
        authActive: true,
        authType: "api-key",
        addTo: "HEADERS",
        key: "X-API-Key",
        value: "<<API_VALUE>>",
      }

      const headers = await generateApiKeyAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "X-API-Key",
        value: "secret-value",
        description: "",
      })
    })

    test("returns empty array when addTo is not HEADERS", async () => {
      const auth: HoppRESTAuth & { authType: "api-key" } = {
        authActive: true,
        authType: "api-key",
        addTo: "QUERY_PARAMS",
        key: "api_key",
        value: "test-value",
      }

      const headers = await generateApiKeyAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(0)
    })

    test("handles template strings in key and value", async () => {
      const auth: HoppRESTAuth & { authType: "api-key" } = {
        authActive: true,
        authType: "api-key",
        addTo: "HEADERS",
        key: "<<API_KEY>>",
        value: "<<API_VALUE>>",
      }

      const headers = await generateApiKeyAuthHeaders(auth, mockEnvVars)

      expect(headers[0].key).toBe("test-key-123")
      expect(headers[0].value).toBe("secret-value")
    })
  })

  describe("generateApiKeyAuthParams", () => {
    test("generates params when addTo is QUERY_PARAMS", async () => {
      const auth: HoppRESTAuth & { authType: "api-key" } = {
        authActive: true,
        authType: "api-key",
        addTo: "QUERY_PARAMS",
        key: "api_key",
        value: "<<API_VALUE>>",
      }

      const params = await generateApiKeyAuthParams(auth, mockEnvVars)

      expect(params).toHaveLength(1)
      expect(params[0]).toEqual({
        active: true,
        key: "api_key",
        value: "secret-value",
        description: "",
      })
    })

    test("returns empty array when addTo is not QUERY_PARAMS", async () => {
      const auth: HoppRESTAuth & { authType: "api-key" } = {
        authActive: true,
        authType: "api-key",
        addTo: "HEADERS",
        key: "X-API-Key",
        value: "test-value",
      }

      const params = await generateApiKeyAuthParams(auth, mockEnvVars)

      expect(params).toHaveLength(0)
    })
  })
})
