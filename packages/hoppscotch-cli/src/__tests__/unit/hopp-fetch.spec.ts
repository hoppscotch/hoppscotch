import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock modules before imports - NO external variable references in factory
vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn(),
  },
}))

vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: any) => instance,
}))

vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}))

import { createHoppFetchHook } from "../../utils/hopp-fetch"
import axios from "axios"

// Get the mocked functions to use in tests
const mockAxios = axios as any
const mockIsAxiosError = mockAxios.isAxiosError as ReturnType<typeof vi.fn>

// Create the axios instance mock that will be returned by create()
const mockAxiosInstance = vi.fn()

describe("CLI hopp-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up axios.create to return our mockAxiosInstance
    mockAxios.create.mockReturnValue(mockAxiosInstance)

    // Default successful response
    mockAxiosInstance.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: new ArrayBuffer(0),
    })

    // Reset isAxiosError mock
    mockIsAxiosError.mockReturnValue(false)
  })

  describe("Request object property extraction", () => {
    it("should extract method from Request object", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        method: "POST",
      })

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
        })
      )
    })

    it("should extract headers from Request object", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        headers: {
          "X-Custom-Header": "test-value",
          Authorization: "Bearer token123",
        },
      })

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-custom-header": "test-value",
            authorization: "Bearer token123",
          }),
        })
      )
    })

    it("should extract body from Request object", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        body: JSON.stringify({ key: "value" }),
      })

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(ArrayBuffer), // Body is converted to ArrayBuffer
        })
      )
    })

    it("should prefer init options over Request properties (method)", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        method: "POST",
      })

      // Init overrides Request method
      await hoppFetch(request, { method: "PUT" })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "PUT",
        })
      )
    })

    it("should prefer init headers over Request headers", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        headers: { "X-Custom": "from-request" },
      })

      // Init overrides Request headers
      await hoppFetch(request, {
        headers: { "X-Custom": "from-init" },
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom": "from-init",
          }),
        })
      )
    })

    it("should merge Request headers with init headers", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        headers: { "X-Request-Header": "value1" },
      })

      await hoppFetch(request, {
        headers: { "X-Init-Header": "value2" },
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-request-header": "value1",
            "X-Init-Header": "value2",
          }),
        })
      )
    })

    it("should extract all properties from Request object", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "secret",
        },
        body: JSON.stringify({ update: true }),
      })

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "PATCH",
          headers: expect.objectContaining({
            "content-type": "application/json",
            "x-api-key": "secret",
          }),
          data: expect.any(ArrayBuffer),
        })
      )
    })
  })

  describe("Standard fetch patterns", () => {
    it("should handle string URLs", async () => {
      const hoppFetch = createHoppFetchHook()

      await hoppFetch("https://api.example.com/data")

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "GET",
        })
      )
    })

    it("should handle URL objects", async () => {
      const hoppFetch = createHoppFetchHook()

      const url = new URL("https://api.example.com/data")
      await hoppFetch(url)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
        })
      )
    })

    it("should handle init options with string URL", async () => {
      const hoppFetch = createHoppFetchHook()

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          data: JSON.stringify({ test: true }),
        })
      )
    })
  })

  describe("Edge cases", () => {
    it("should default to GET when no method specified", async () => {
      const hoppFetch = createHoppFetchHook()

      await hoppFetch("https://api.example.com/data")

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
        })
      )
    })

    it("should handle Request with no headers", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data")

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {},
        })
      )
    })

    it("should handle Request with no body", async () => {
      const hoppFetch = createHoppFetchHook()

      const request = new Request("https://api.example.com/data")

      await hoppFetch(request)

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: undefined,
        })
      )
    })

    it("should handle FormData body", async () => {
      const hoppFetch = createHoppFetchHook()

      const formData = new FormData()
      formData.append("key", "value")

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: formData,
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: formData,
        })
      )
    })

    it("should handle Blob body", async () => {
      const hoppFetch = createHoppFetchHook()

      const blob = new Blob(["test data"], { type: "text/plain" })

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: blob,
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: blob,
        })
      )
    })

    it("should handle ArrayBuffer body", async () => {
      const hoppFetch = createHoppFetchHook()

      const buffer = new ArrayBuffer(8)

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: buffer,
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: buffer,
        })
      )
    })

    it("should convert Headers object to plain object", async () => {
      const hoppFetch = createHoppFetchHook()

      const headers = new Headers({
        "X-Custom": "value",
        "Content-Type": "application/json",
      })

      await hoppFetch("https://api.example.com/data", {
        headers,
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-custom": "value",
            "content-type": "application/json",
          }),
        })
      )
    })

    it("should convert headers array to plain object", async () => {
      const hoppFetch = createHoppFetchHook()

      const headers: [string, string][] = [
        ["X-Custom", "value"],
        ["Content-Type", "application/json"],
      ]

      await hoppFetch("https://api.example.com/data", {
        headers,
      })

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom": "value",
            "Content-Type": "application/json",
          }),
        })
      )
    })
  })

  describe("Response handling", () => {
    it("should return response with correct status and statusText", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 201,
        statusText: "Created",
        headers: {},
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.status).toBe(201)
      expect(response.statusText).toBe("Created")
    })

    it("should set ok to true for 2xx status codes", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {},
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.ok).toBe(true)
    })

    it("should set ok to false for non-2xx status codes", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 404,
        statusText: "Not Found",
        headers: {},
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.ok).toBe(false)
    })

    it("should convert response headers to serializable format", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "application/json",
          "x-custom-header": "value",
        },
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.get("content-type")).toBe("application/json")
      expect(response.headers.get("x-custom-header")).toBe("value")
    })

    it("should handle Set-Cookie headers as array", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {
          "set-cookie": ["session=abc123", "token=xyz789"],
        },
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.getSetCookie()).toEqual([
        "session=abc123",
        "token=xyz789",
      ])
    })

    it("should handle single Set-Cookie header as string", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {
          "set-cookie": "session=abc123",
        },
        data: new ArrayBuffer(0),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.getSetCookie()).toEqual(["session=abc123"])
    })

    it("should convert response body ArrayBuffer to byte array", async () => {
      const hoppFetch = createHoppFetchHook()

      const data = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {},
        data: data.buffer,
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect((response as any)._bodyBytes).toEqual([72, 101, 108, 108, 111])
    })

    it("should handle response body text conversion", async () => {
      const hoppFetch = createHoppFetchHook()

      const data = new TextEncoder().encode("Hello World")
      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {},
        data: data.buffer,
      })

      const response = await hoppFetch("https://api.example.com/data")
      const text = await response.text()

      expect(text).toBe("Hello World")
    })

    it("should handle response body json conversion", async () => {
      const hoppFetch = createHoppFetchHook()

      const jsonData = { message: "success" }
      const data = new TextEncoder().encode(JSON.stringify(jsonData))
      mockAxiosInstance.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: {},
        data: data.buffer,
      })

      const response = await hoppFetch("https://api.example.com/data")
      const json = await response.json()

      expect(json).toEqual(jsonData)
    })
  })

  describe("Error handling", () => {
    it("should handle axios error with response", async () => {
      const hoppFetch = createHoppFetchHook()

      const errorResponse = {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        data: new ArrayBuffer(0),
      }

      mockAxiosInstance.mockRejectedValue({
        response: errorResponse,
        isAxiosError: true,
      })
      mockIsAxiosError.mockReturnValue(true)

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.status).toBe(500)
      expect(response.statusText).toBe("Internal Server Error")
    })

    it("should throw error for network failure without response", async () => {
      const hoppFetch = createHoppFetchHook()

      const networkError = new Error("Network Error")
      mockAxiosInstance.mockRejectedValue(networkError)
      mockIsAxiosError.mockReturnValue(false)

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Network Error"
      )
    })

    it("should throw error for non-Error exceptions", async () => {
      const hoppFetch = createHoppFetchHook()

      mockAxiosInstance.mockRejectedValue("String error")
      mockIsAxiosError.mockReturnValue(false)

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Unknown error"
      )
    })
  })
})
