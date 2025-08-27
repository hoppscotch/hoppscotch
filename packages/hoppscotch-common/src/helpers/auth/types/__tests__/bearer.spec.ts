import { HoppRESTAuth } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { generateBearerAuthHeaders } from "../bearer"
import { mockEnvVars } from "./test-utils"

describe("Bearer Auth", () => {
  describe("generateBearerAuthHeaders", () => {
    test("generates bearer auth header with token", async () => {
      const auth: HoppRESTAuth & { authType: "bearer" } = {
        authActive: true,
        authType: "bearer",
        token: "abc123token",
      }

      const headers = await generateBearerAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: "Bearer abc123token",
        description: "",
      })
    })

    test("handles template strings in token", async () => {
      const auth: HoppRESTAuth & { authType: "bearer" } = {
        authActive: true,
        authType: "bearer",
        token: "<<ACCESS_TOKEN>>",
      }

      const headers = await generateBearerAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe(
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      )
    })

    test("handles empty token", async () => {
      const auth: HoppRESTAuth & { authType: "bearer" } = {
        authActive: true,
        authType: "bearer",
        token: "",
      }

      const headers = await generateBearerAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe("Bearer ")
    })
  })
})
