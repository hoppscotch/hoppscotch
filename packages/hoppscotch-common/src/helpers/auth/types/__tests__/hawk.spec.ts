import { describe, test, expect, vi, beforeEach } from "vitest"
import { generateHawkAuthHeaders } from "../hawk"
import { createBaseRequest, mockEnvVars } from "./test-utils"
import { HoppRESTAuth } from "@hoppscotch/data"

// Mock the calculateHawkHeader function
vi.mock("@hoppscotch/data", async () => {
  const actual = await vi.importActual("@hoppscotch/data")
  return {
    ...actual,
    calculateHawkHeader: vi.fn(),
  }
})

// Mock the getFinalBodyFromRequest function
vi.mock("~/helpers/utils/EffectiveURL", () => ({
  getFinalBodyFromRequest: vi.fn(),
}))

const { calculateHawkHeader } = await import("@hoppscotch/data")
const { getFinalBodyFromRequest } = await import("~/helpers/utils/EffectiveURL")

describe("Hawk Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateHawkAuthHeaders", () => {
    test("generates hawk authorization header", async () => {
      vi.mocked(calculateHawkHeader).mockResolvedValue(
        'Hawk id="test-hawk-id", ts="1234567890", nonce="abcdef", mac="xyz123"'
      )
      vi.mocked(getFinalBodyFromRequest).mockReturnValue('{"test": "data"}')

      const auth: HoppRESTAuth & { authType: "hawk" } = {
        authActive: true,
        authType: "hawk",
        authId: "<<HAWK_ID>>",
        authKey: "<<HAWK_KEY>>",
        algorithm: "sha256",
        includePayloadHash: true,
      }

      const headers = await generateHawkAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(headers).toHaveLength(1)
      expect(headers[0]).toEqual({
        active: true,
        key: "Authorization",
        value:
          'Hawk id="test-hawk-id", ts="1234567890", nonce="abcdef", mac="xyz123"',
        description: "",
      })
    })

    test("returns empty array for non-hawk auth type", async () => {
      const auth: HoppRESTAuth & { authType: "basic" } = {
        authActive: true,
        authType: "basic",
        username: "user",
        password: "pass",
      }

      const headers = await generateHawkAuthHeaders(
        auth,
        createBaseRequest(),
        mockEnvVars
      )

      expect(headers).toHaveLength(0)
    })

    test("handles template strings in auth parameters", async () => {
      vi.mocked(calculateHawkHeader).mockResolvedValue(
        'Hawk id="test-hawk-id", mac="xyz123"'
      )
      vi.mocked(getFinalBodyFromRequest).mockReturnValue("")

      const auth: HoppRESTAuth & { authType: "hawk" } = {
        authActive: true,
        authType: "hawk",
        authId: "<<HAWK_ID>>",
        authKey: "<<HAWK_KEY>>",
        algorithm: "sha1",
        includePayloadHash: false,
      }

      await generateHawkAuthHeaders(auth, createBaseRequest(), mockEnvVars)

      expect(calculateHawkHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-hawk-id",
          key: "test-hawk-key",
          algorithm: "sha1",
        })
      )
    })

    test("handles optional hawk parameters", async () => {
      vi.mocked(calculateHawkHeader).mockResolvedValue(
        'Hawk id="test-hawk-id", mac="xyz123"'
      )
      vi.mocked(getFinalBodyFromRequest).mockReturnValue("")

      const auth: HoppRESTAuth & { authType: "hawk" } = {
        authActive: true,
        authType: "hawk",
        authId: "<<HAWK_ID>>",
        authKey: "<<HAWK_KEY>>",
        algorithm: "sha256",
        nonce: "custom-nonce",
        ext: "custom-ext",
        app: "custom-app",
        dlg: "custom-dlg",
        timestamp: "1234567890",
        includePayloadHash: false,
      }

      await generateHawkAuthHeaders(auth, createBaseRequest(), mockEnvVars)

      expect(calculateHawkHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          nonce: "custom-nonce",
          ext: "custom-ext",
          app: "custom-app",
          dlg: "custom-dlg",
          timestamp: 1234567890,
        })
      )
    })
  })
})
