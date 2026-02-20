import { HoppRESTAuth } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { generateBasicAuthHeaders } from "../basic"
import { mockEnvVars } from "./test-utils"

describe("Basic Auth", () => {
  describe("generateBasicAuthHeaders", () => {
    test("generates basic auth header with credentials", async () => {
      const auth: HoppRESTAuth & { authType: "basic" } = {
        authActive: true,
        authType: "basic",
        username: "admin",
        password: "secret123",
      }

      const headers = await generateBasicAuthHeaders(auth, mockEnvVars)

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value: `Basic ${btoa("admin:secret123")}`,
        description: "",
      })
    })

    test("handles template strings in username and password", async () => {
      const auth: HoppRESTAuth & { authType: "basic" } = {
        authActive: true,
        authType: "basic",
        username: "<<USERNAME>>",
        password: "<<PASSWORD>>",
      }

      const headers = await generateBasicAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe(`Basic ${btoa("testuser:testpass")}`)
    })

    test("handles empty credentials", async () => {
      const auth: HoppRESTAuth & { authType: "basic" } = {
        authActive: true,
        authType: "basic",
        username: "",
        password: "",
      }

      const headers = await generateBasicAuthHeaders(auth, mockEnvVars)

      expect(headers[0].value).toBe(`Basic ${btoa(":")}`)
    })

    test("resolves secret env vars before base64 encoding even with showKeyIfSecret", async () => {
      const auth: HoppRESTAuth & { authType: "basic" } = {
        authActive: true,
        authType: "basic",
        username: "<<USERNAME>>",
        password: "<<PASSWORD>>",
      }

      // PASSWORD is a secret env var in mockEnvVars.
      // With showKeyIfSecret=true, it should still resolve before base64 encoding.
      // See: https://github.com/hoppscotch/hoppscotch/issues/5863
      const headers = await generateBasicAuthHeaders(
        auth,
        mockEnvVars,
        true // showKeyIfSecret
      )

      expect(headers[0].value).toBe(`Basic ${btoa("testuser:testpass")}`)
    })
  })
})
