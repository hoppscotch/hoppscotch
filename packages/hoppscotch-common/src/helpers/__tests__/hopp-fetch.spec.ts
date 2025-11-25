import { describe, expect, it, vi, beforeEach } from "vitest"
import { createHoppFetchHook } from "../hopp-fetch"
import type { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import * as E from "fp-ts/Either"

// Mock KernelInterceptorService
const mockKernelInterceptor: KernelInterceptorService = {
  execute: vi.fn(),
} as any

describe("Common hopp-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful response
    ;(mockKernelInterceptor.execute as any).mockReturnValue({
      response: Promise.resolve(
        E.right({
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          body: {
            body: new ArrayBuffer(0),
          },
        })
      ),
    })
  })

  describe("Request object property extraction", () => {
    it("should extract method from Request object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        method: "POST",
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
        })
      )
    })

    it("should extract headers from Request object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        headers: {
          "X-Custom-Header": "test-value",
          Authorization: "Bearer token123",
        },
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            "x-custom-header": "test-value",
            authorization: "Bearer token123",
          },
        })
      )
    })

    it("should extract body from Request object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        body: JSON.stringify({ key: "value" }),
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "text",
            content: JSON.stringify({ key: "value" }),
          }),
        })
      )
    })

    it("should preserve binary data from Request object with binary content-type", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      // Create binary data (e.g., image bytes)
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])

      const request = new Request("https://api.example.com/upload", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: binaryData,
      })

      await hoppFetch(request)

      const call = (mockKernelInterceptor.execute as any).mock.calls[0][0]
      expect(call.content.kind).toBe("binary")
      expect(call.content.content).toBeInstanceOf(Uint8Array)
      // Verify the binary data is preserved (not corrupted by text conversion)
      expect(Array.from(call.content.content as Uint8Array)).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a,
      ])
    })

    it("should convert text content from Request object with text content-type", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const textData = new TextEncoder().encode("Hello World")

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: textData,
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "text",
            content: "Hello World",
          }),
        })
      )
    })

    it("should handle JSON content from Request object with json content-type", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const jsonData = new TextEncoder().encode('{"key":"value"}')

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonData,
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "text",
            content: '{"key":"value"}',
          }),
        })
      )
    })

    it("should prefer init options over Request properties (method)", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        method: "POST",
      })

      // Init overrides Request method
      await hoppFetch(request, { method: "PUT" })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "PUT",
        })
      )
    })

    it("should prefer init headers over Request headers", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        headers: { "X-Custom": "from-request" },
      })

      // Init overrides Request headers
      await hoppFetch(request, {
        headers: { "X-Custom": "from-init" },
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            "x-custom": "from-init",
          },
        })
      )
    })

    it("should merge Request headers with init headers", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        headers: { "X-Request-Header": "value1" },
      })

      await hoppFetch(request, {
        headers: { "X-Init-Header": "value2" },
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            "x-request-header": "value1",
            "x-init-header": "value2",
          },
        })
      )
    })

    it("should extract all properties from Request object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "secret",
        },
        body: JSON.stringify({ update: true }),
      })

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-api-key": "secret",
          },
          content: expect.objectContaining({
            kind: "text",
            content: JSON.stringify({ update: true }),
          }),
        })
      )
    })

    it("should prefer init body over Request body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        body: JSON.stringify({ from: "request" }),
      })

      await hoppFetch(request, {
        body: JSON.stringify({ from: "init" }),
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            content: JSON.stringify({ from: "init" }),
          }),
        })
      )
    })
  })

  describe("Standard fetch patterns", () => {
    it("should handle string URLs", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      await hoppFetch("https://api.example.com/data")

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "GET",
        })
      )
    })

    it("should handle URL objects", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const url = new URL("https://api.example.com/data")
      await hoppFetch(url)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
        })
      )
    })

    it("should handle init options with string URL", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/data",
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          content: expect.objectContaining({
            kind: "text",
            content: JSON.stringify({ test: true }),
          }),
        })
      )
    })
  })

  describe("Edge cases", () => {
    it("should default to GET when no method specified", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      await hoppFetch("https://api.example.com/data")

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
        })
      )
    })

    it("should handle Request with no headers", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data")

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {},
        })
      )
    })

    it("should handle Request with no body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const request = new Request("https://api.example.com/data")

      await hoppFetch(request)

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: undefined,
        })
      )
    })

    it("should handle FormData body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const formData = new FormData()
      formData.append("key", "value")

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: formData,
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "multipart",
            mediaType: "multipart/form-data",
          }),
        })
      )
    })
  })

  describe("Body type handling", () => {
    // Skip Blob tests in Node.js environment - Node's Blob polyfill doesn't have arrayBuffer()
    it.skip("should handle Blob body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const blob = new Blob(["test data"], { type: "text/plain" })

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: blob,
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "binary",
            mediaType: "text/plain",
          }),
        })
      )
    })

    // Skip Blob tests in Node.js environment - Node's Blob polyfill doesn't have arrayBuffer()
    it.skip("should handle Blob body with default mediaType", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const blob = new Blob(["test data"])

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: blob,
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "binary",
            mediaType: "application/octet-stream",
          }),
        })
      )
    })

    it("should handle ArrayBuffer body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const buffer = new ArrayBuffer(8)

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: buffer,
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "binary",
            mediaType: "application/octet-stream",
          }),
        })
      )
    })

    it("should handle Uint8Array body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const uint8Array = new Uint8Array([1, 2, 3, 4])

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: uint8Array,
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "binary",
            mediaType: "application/octet-stream",
          }),
        })
      )
    })

    it("should detect content-type from headers for string body", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: "<xml></xml>",
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "text",
            content: "<xml></xml>",
            mediaType: "application/xml",
          }),
        })
      )
    })

    it("should use default mediaType for string body without content-type header", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      await hoppFetch("https://api.example.com/data", {
        method: "POST",
        body: "plain text",
      })

      expect(mockKernelInterceptor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "text",
            content: "plain text",
            mediaType: "text/plain",
          }),
        })
      )
    })
  })

  describe("Response handling", () => {
    it("should return response with correct status and statusText", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 201,
            statusText: "Created",
            headers: {},
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.status).toBe(201)
      expect(response.statusText).toBe("Created")
    })

    it("should set ok to true for 2xx status codes", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.ok).toBe(true)
    })

    it("should set ok to false for non-2xx status codes", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 404,
            statusText: "Not Found",
            headers: {},
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.ok).toBe(false)
    })

    it("should handle multiHeaders format from agent interceptor", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            multiHeaders: [
              { key: "content-type", value: "application/json" },
              { key: "x-custom-header", value: "value" },
              { key: "set-cookie", value: "session=abc123" },
              { key: "set-cookie", value: "token=xyz789" },
            ],
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.get("content-type")).toBe("application/json")
      expect(response.headers.get("x-custom-header")).toBe("value")
      expect(response.headers.getSetCookie()).toEqual([
        "session=abc123",
        "token=xyz789",
      ])
    })

    it("should handle headers format from other interceptors", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {
              "content-type": "application/json",
              "set-cookie": ["session=abc123", "token=xyz789"],
            },
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.get("content-type")).toBe("application/json")
      expect(response.headers.getSetCookie()).toEqual([
        "session=abc123",
        "token=xyz789",
      ])
    })

    it("should handle single Set-Cookie header as string", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {
              "set-cookie": "session=abc123",
            },
            body: { body: new ArrayBuffer(0) },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect(response.headers.getSetCookie()).toEqual(["session=abc123"])
    })

    it("should convert response body to byte array", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const data = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: data.buffer },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect((response as any)._bodyBytes).toEqual([72, 101, 108, 108, 111])
    })

    it("should handle response body text conversion", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const data = new TextEncoder().encode("Hello World")
      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: Array.from(data) }, // Convert to plain array for serialization
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")
      const text = await response.text()

      expect(text).toBe("Hello World")
    })

    it("should handle response body json conversion", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      const jsonData = { message: "success" }
      const data = new TextEncoder().encode(JSON.stringify(jsonData))
      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: Array.from(data) }, // Convert to plain array for serialization
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")
      const json = await response.json()

      expect(json).toEqual(jsonData)
    })

    it("should handle body as plain array", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: [72, 101, 108, 108, 111] },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect((response as any)._bodyBytes).toEqual([72, 101, 108, 108, 111])
    })

    it("should handle body as Buffer-like object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.right({
            status: 200,
            statusText: "OK",
            headers: {},
            body: { body: { type: "Buffer", data: [72, 101, 108, 108, 111] } },
          })
        ),
      })

      const response = await hoppFetch("https://api.example.com/data")

      expect((response as any)._bodyBytes).toEqual([72, 101, 108, 108, 111])
    })
  })

  describe("Error handling", () => {
    it("should throw error when kernel interceptor returns Left with string", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(E.left("Network error")),
      })

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Network error"
      )
    })

    it("should throw error when kernel interceptor returns Left with humanMessage object", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(
          E.left({
            humanMessage: {
              heading: () => "Connection failed",
            },
          })
        ),
      })

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Connection failed"
      )
    })

    it("should throw error when kernel interceptor returns Left with object without humanMessage", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(E.left({ code: "ERROR", message: "Failed" })),
      })

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Unknown error"
      )
    })

    it("should throw error for null error value", async () => {
      const hoppFetch = createHoppFetchHook(mockKernelInterceptor)

      ;(mockKernelInterceptor.execute as any).mockReturnValue({
        response: Promise.resolve(E.left(null)),
      })

      await expect(hoppFetch("https://api.example.com/data")).rejects.toThrow(
        "Fetch failed: Unknown error"
      )
    })
  })
})
