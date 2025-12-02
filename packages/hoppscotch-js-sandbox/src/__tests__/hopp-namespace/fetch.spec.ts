import { describe, expect, test, vi } from "vitest"
import { runTest } from "~/utils/test-helpers"
import type { HoppFetchHook } from "~/types"

/**
 * Comprehensive tests for hopp.fetch() and global fetch() API
 *
 * This test suite covers the complete Fetch API implementation including:
 * - Basic fetch functionality (GET, POST, PUT, DELETE, PATCH)
 * - Request and Response constructors
 * - Body methods (text, json, arrayBuffer, blob, formData)
 * - Body consumption tracking (bodyUsed property)
 * - Response and Request cloning
 * - Headers class operations
 * - AbortController functionality
 * - Error handling
 * - Environment variable integration
 * - Edge cases and status codes
 *
 * The actual network requests are mocked via the hoppFetchHook parameter.
 */

describe("hopp.fetch() and global fetch()", () => {
  describe("Basic functionality", () => {
    test("hopp.fetch should be defined and callable", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            pw.expect(typeof hopp.fetch).toBe("function")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'function' to be 'function'",
            },
          ],
        }),
      ])
    })

    test("hopp.fetch should make GET request with string URL", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async (_input, _init) => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/data")
            pw.expect(response.status).toBe(200)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        undefined
      )
    })

    test("hopp.fetch should make POST request with JSON body", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async (_input, _init) => {
        return new Response(JSON.stringify({ created: true, id: 42 }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/items", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ name: "test" })
            })
            pw.expect(response.status).toBe(201)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '201' to be '201'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/items",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ name: "test" }),
        })
      )
    })

    test("hopp.fetch should handle URL object", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            const url = new URL("https://api.example.com/data")
            const response = await hopp.fetch(url)
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
          ],
        }),
      ])
    })
  })

  describe("Response handling", () => {
    test("hopp.fetch should handle text response", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("Plain text response", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/text")
            pw.expect(response.status).toBe(200)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])
    })

    test("hopp.fetch should handle response headers", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        const headers = new Headers()
        headers.set("X-Custom-Header", "custom-value")
        headers.set("Content-Type", "application/json")

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers,
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/data")
            pw.expect(response.status).toBe(200)
            pw.expect(typeof response.headers).toBe("object")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'object' to be 'object'",
            },
          ],
        }),
      ])
    })

    test("hopp.fetch should handle status codes", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          statusText: "Not Found",
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/missing")
            pw.expect(response.status).toBe(404)
            pw.expect(response.statusText).toBe("Not Found")
            pw.expect(response.ok).toBe(false)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '404' to be '404'",
            },
            {
              status: "pass",
              message: "Expected 'Not Found' to be 'Not Found'",
            },
            {
              status: "pass",
              message: "Expected 'false' to be 'false'",
            },
          ],
        }),
      ])
    })
  })

  describe("HTTP methods", () => {
    test("hopp.fetch should support PUT method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ updated: true }), { status: 200 })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/items/1", {
              method: "PUT",
              body: JSON.stringify({ name: "updated" })
            })
            pw.expect(response.status).toBe(200)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])
    })

    test("hopp.fetch should support DELETE method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(null, { status: 204 })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/items/1", {
              method: "DELETE"
            })
            pw.expect(response.status).toBe(204)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '204' to be '204'",
            },
          ],
        }),
      ])
    })

    test("hopp.fetch should support PATCH method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ patched: true }), { status: 200 })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/items/1", {
              method: "PATCH",
              body: JSON.stringify({ field: "value" })
            })
            pw.expect(response.status).toBe(200)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])
    })
  })

  describe("Headers", () => {
    test("hopp.fetch should send custom headers", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/data", {
              headers: {
                "Authorization": "Bearer token123",
                "X-API-Key": "key456"
              }
            })
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
            "X-API-Key": "key456",
          }),
        })
      )
    })
  })

  describe("Error handling", () => {
    test("hopp.fetch should handle fetch errors", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        throw new Error("Network error")
      })

      await expect(
        runTest(
          `
            let errorOccurred = false
            try {
              await hopp.fetch("https://api.example.com/data")
            } catch (error) {
              errorOccurred = true
              pw.expect(error.message).toBe("Network error")
            }
            pw.expect(errorOccurred).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'Network error' to be 'Network error'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])
    })
  })

  describe("Integration with environment variables", () => {
    test("hopp.fetch should work with dynamic URLs from env vars", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ data: "test" }), { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.env.set("API_URL", "https://api.example.com")
            const url = hopp.env.get("API_URL") + "/data"
            const response = await hopp.fetch(url)
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        undefined
      )
    })

    test("hopp.fetch should store response data in env vars", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ token: "abc123" }), {
          status: 200,
        })
      })

      await expect(
        runTest(
          `
            const response = await hopp.fetch("https://api.example.com/auth")
            pw.expect(response.status).toBe(200)
            hopp.env.set("AUTH_TOKEN", "abc123")
            pw.expect(hopp.env.get("AUTH_TOKEN")).toBe("abc123")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'abc123' to be 'abc123'",
            },
          ],
        }),
      ])
    })
  })

  describe("Global fetch() alias", () => {
    test("global fetch() should be defined and callable", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            pw.expect(typeof fetch).toBe("function")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'function' to be 'function'",
            },
          ],
        }),
      ])
    })

    test("global fetch() should work identically to hopp.fetch()", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async (_input, _init) => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            const response = await fetch("https://api.example.com/data")
            pw.expect(response.status).toBe(200)
            pw.expect(response.ok).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
            {
              status: "pass",
              message: "Expected 'true' to be 'true'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        undefined
      )
    })

    test("global fetch() should support POST with body", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async (_input, _init) => {
        return new Response(JSON.stringify({ created: true }), {
          status: 201,
        })
      })

      await expect(
        runTest(
          `
            const response = await fetch("https://api.example.com/items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "test" })
            })
            pw.expect(response.status).toBe(201)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '201' to be '201'",
            },
          ],
        }),
      ])
    })

    test("global fetch() and hopp.fetch() should call the same hook", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            await fetch("https://api.example.com/test1")
            await hopp.fetch("https://api.example.com/test2")
            pw.expect(1).toBe(1)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '1' to be '1'",
            },
          ],
        }),
      ])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.example.com/test1",
        undefined
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.example.com/test2",
        undefined
      )
    })

    test("global fetch() should handle response.text() method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("Hello World", { status: 200 })
      })

      await expect(
        runTest(
          `
            const response = await fetch("https://api.example.com/text")
            const text = await response.text()
            pw.expect(text).toBe("Hello World")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'Hello World' to be 'Hello World'",
            },
          ],
        }),
      ])
    })

    test("global fetch() should handle Headers class integration", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            const headers = new Headers()
            headers.set("Authorization", "Bearer token123")
            headers.set("Accept", "application/json")
            
            const response = await fetch("https://api.example.com/data", {
              headers: headers
            })
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
          ],
        }),
      ])

      // Verify Headers were converted and passed correctly (native Headers lowercases keys)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer token123",
            accept: "application/json",
          }),
        })
      )
    })

    test("global fetch() should work with Request constructor", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            const request = new Request("https://api.example.com/data", {
              method: "GET",
              headers: { "User-Agent": "Test" }
            })
            
            const response = await fetch(request)
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected '200' to be '200'",
            },
          ],
        }),
      ])
    })

    test("global fetch() should handle response cloning", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ data: "test" }), { status: 200 })
      })

      const result = await runTest(
        `
          const response = await fetch("https://api.example.com/data")
          const cloned = response.clone()
          
          pw.expect(typeof response.clone).toBe("function")
          pw.expect(typeof cloned.json).toBe("function")
          pw.expect(response.status).toBe(200)
          pw.expect(cloned.status).toBe(200)
        `,
        { global: [], selected: [] },
        undefined,
        undefined,
        mockFetch
      )()

      expect(result).toBeRight()
      // For simple GET, init is undefined in our module
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        undefined
      )
    })

    test("global fetch() should handle error responses", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
        })
      })

      await expect(
        runTest(
          `
            const response = await fetch("https://api.example.com/missing")
            pw.expect(response.ok).toBe(false)
            pw.expect(response.status).toBe(404)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'false' to be 'false'",
            },
            {
              status: "pass",
              message: "Expected '404' to be '404'",
            },
          ],
        }),
      ])
    })
  })

  describe("Body methods", () => {
    test("response.arrayBuffer() returns array of bytes", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("Hello", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("arrayBuffer returns array", async () => {
              const response = await hopp.fetch("https://api.example.com/binary")
              pw.expect(typeof response.arrayBuffer).toBe("function")

              const buffer = await response.arrayBuffer()
              pw.expect(Array.isArray(buffer)).toBe(true)
              pw.expect(buffer.length > 0).toBe(true)
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "arrayBuffer returns array",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("response.blob() returns blob object with size and type", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("test data", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("blob returns blob object", async () => {
              const response = await hopp.fetch("https://api.example.com/data")
              pw.expect(typeof response.blob).toBe("function")

              const blob = await response.blob()
              pw.expect(typeof blob).toBe("object")
              pw.expect(typeof blob.size).toBe("number")
              pw.expect(blob.size > 0).toBe(true)
              pw.expect(typeof blob.type).toBe("string")
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "blob returns blob object",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("response.formData() parses form-encoded data", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("name=John&age=30", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("formData parses data", async () => {
              const response = await hopp.fetch("https://api.example.com/form")
              pw.expect(typeof response.formData).toBe("function")

              const data = await response.formData()
              pw.expect(typeof data).toBe("object")
              pw.expect(data.name).toBe("John")
              pw.expect(data.age).toBe("30")
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "formData parses data",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Body consumption tracking", () => {
    test("bodyUsed should be false initially and true after consuming", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ data: "test" }), { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("bodyUsed tracks consumption", async () => {
              const response = await hopp.fetch("https://api.example.com/data")
              pw.expect(response.bodyUsed).toBe(false)

              await response.json()
              pw.expect(response.bodyUsed).toBe(true)
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "bodyUsed tracks consumption",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("reading body twice should throw error", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("test data", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("cannot read body twice", async () => {
              const response = await hopp.fetch("https://api.example.com/data")

              await response.text()
              pw.expect(response.bodyUsed).toBe(true)

              try {
                await response.text()
                pw.expect(true).toBe(false) // Should not reach here
              } catch (error) {
                pw.expect(error.message).toInclude("Body has already been consumed")
              }
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "cannot read body twice",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("different body methods should all consume the body", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("test", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("arrayBuffer consumes body", async () => {
              const response = await hopp.fetch("https://api.example.com/data")
              await response.arrayBuffer()
              pw.expect(response.bodyUsed).toBe(true)
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "arrayBuffer consumes body",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Response cloning", () => {
    test("response.clone() creates independent copy with separate body consumption", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ value: 42 }), { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("clone has independent body", async () => {
              try {
                const response = await hopp.fetch("https://api.example.com/data")
                pw.expect(typeof response.clone).toBe("function")

                const clone = response.clone()
                pw.expect(typeof clone).toBe("object")
                pw.expect(clone.status).toBe(200)

                // Read original body (use text to avoid JSON parse errors)
                const originalText = await response.text()
                pw.expect(response.bodyUsed).toBe(true)
                pw.expect(clone.bodyUsed).toBe(false)

                // Clone body should still be readable (use text)
                const clonedText = await clone.text()
                pw.expect(typeof clonedText).toBe("string")
                pw.expect(clone.bodyUsed).toBe(true)
              } catch (_e) {
                // Ensure any exception is recorded as a test failure instead of an execution error
                pw.expect(true).toBe(false)
              }
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "clone has independent body",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("cloned response should preserve all properties and headers", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          statusText: "Created",
          headers: { "X-Custom": "value" },
        })
      })

      await expect(
        runTest(
          `
            hopp.test("clone preserves properties", async () => {
              try {
                const response = await hopp.fetch("https://api.example.com/create")
                const clone = response.clone()

                pw.expect(clone.status).toBe(201)
                pw.expect(clone.statusText).toBe("Created")
                pw.expect(clone.ok).toBe(true)

                // Both should have the same body text
                const originalText = await response.text()
                const clonedText = await clone.text()
                pw.expect(originalText).toBe(clonedText)
              } catch (_e) {
                // Ensure any exception is recorded as a test failure instead of an execution error
                pw.expect(true).toBe(false)
              }
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "clone preserves properties",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("cloning consumed response should fail", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("test", { status: 200 })
      })

      await expect(
        runTest(
          `
            hopp.test("cannot clone consumed response", async () => {
              const response = await hopp.fetch("https://api.example.com/data")

              await response.text()
              pw.expect(response.bodyUsed).toBe(true)

              const clone = response.clone()
              // The clone should have an error marker
              pw.expect(clone._error).toBe(true)
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "cannot clone consumed response",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Request constructor and cloning", () => {
    test("new Request() should create request object with properties", async () => {
      await expect(
        runTest(
          `
            const req = new Request("https://api.example.com/data", {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            })

            pw.expect(req.url).toBe("https://api.example.com/data")
            pw.expect(req.method).toBe("POST")
            pw.expect(typeof req.headers).toBe("object")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message:
                "Expected 'https://api.example.com/data' to be 'https://api.example.com/data'",
            },
            { status: "pass", message: "Expected 'POST' to be 'POST'" },
            { status: "pass", message: "Expected 'object' to be 'object'" },
          ],
        }),
      ])
    })

    test("request.clone() should create independent copy", async () => {
      await expect(
        runTest(
          `
            const req1 = new Request("https://api.example.com/data", { method: "POST" })
            const req2 = req1.clone()

            pw.expect(req2.url).toBe(req1.url)
            pw.expect(req2.method).toBe(req1.method)
            pw.expect(req2.url).toBe("https://api.example.com/data")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: expect.stringContaining("to be") },
            { status: "pass", message: expect.stringContaining("to be") },
            {
              status: "pass",
              message:
                "Expected 'https://api.example.com/data' to be 'https://api.example.com/data'",
            },
          ],
        }),
      ])
    })

    test("Request should have bodyUsed property", async () => {
      await expect(
        runTest(
          `
            const req = new Request("https://api.example.com/data")
            pw.expect(req.bodyUsed).toBe(false)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'false' to be 'false'" },
          ],
        }),
      ])
    })
  })

  describe("Headers class", () => {
    test("new Headers() should create headers object", async () => {
      await expect(
        runTest(
          `
            const headers = new Headers()
            headers.set("Content-Type", "application/json")

            pw.expect(headers.get("Content-Type")).toBe("application/json")
            pw.expect(headers.has("Content-Type")).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            {
              status: "pass",
              message: "Expected 'application/json' to be 'application/json'",
            },
            { status: "pass", message: "Expected 'true' to be 'true'" },
          ],
        }),
      ])
    })

    test("Headers.append() should add values", async () => {
      await expect(
        runTest(
          `
            const headers = new Headers()
            headers.append("X-Custom", "value1")
            headers.append("X-Custom", "value2")

            // Note: Native Headers combines with comma, we just overwrite
            pw.expect(headers.has("X-Custom")).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
          ],
        }),
      ])
    })

    test("Headers.delete() should remove header", async () => {
      await expect(
        runTest(
          `
            const headers = new Headers({ "X-Custom": "value" })
            pw.expect(headers.has("X-Custom")).toBe(true)

            headers.delete("X-Custom")
            pw.expect(headers.has("X-Custom")).toBe(false)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected 'false' to be 'false'" },
          ],
        }),
      ])
    })

    test("Headers.entries() should return array of [key, value] pairs", async () => {
      await expect(
        runTest(
          `
            const headers = new Headers({ "Content-Type": "application/json", "X-Custom": "test" })
            const entries = Array.from(headers.entries())

            pw.expect(Array.isArray(entries)).toBe(true)
            pw.expect(entries.length).toBe(2)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected '2' to be '2'" },
          ],
        }),
      ])
    })

    test("Headers can be used with fetch()", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response("OK", { status: 200 })
      })

      await expect(
        runTest(
          `
            const headers = new Headers()
            headers.set("Authorization", "Bearer token123")

            const response = await hopp.fetch("https://api.example.com/data", { headers })
            pw.expect(response.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected '200' to be '200'" },
          ],
        }),
      ])

      // Verify headers were sent (native Headers lowercases keys)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer token123",
          }),
        })
      )
    })
  })

  describe("AbortController", () => {
    test("new AbortController() should create controller with signal", async () => {
      await expect(
        runTest(
          `
            const controller = new AbortController()

            pw.expect(typeof controller).toBe("object")
            pw.expect(typeof controller.signal).toBe("object")
            pw.expect(controller.signal.aborted).toBe(false)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'object' to be 'object'" },
            { status: "pass", message: "Expected 'false' to be 'false'" },
          ],
        }),
      ])
    })

    test("controller.abort() should set signal.aborted to true", async () => {
      await expect(
        runTest(
          `
            const controller = new AbortController()
            pw.expect(controller.signal.aborted).toBe(false)

            controller.abort()
            pw.expect(controller.signal.aborted).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'false' to be 'false'" },
            { status: "pass", message: "Expected 'true' to be 'true'" },
          ],
        }),
      ])
    })

    test("signal.addEventListener should register abort listener", async () => {
      await expect(
        runTest(
          `
            const controller = new AbortController()
            let listenerCalled = false

            controller.signal.addEventListener("abort", () => {
              listenerCalled = true
            })

            controller.abort()
            pw.expect(listenerCalled).toBe(true)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'true' to be 'true'" },
          ],
        }),
      ])
    })

    test("multiple abort listeners should all be called", async () => {
      await expect(
        runTest(
          `
            const controller = new AbortController()
            let count = 0

            controller.signal.addEventListener("abort", () => { count++ })
            controller.signal.addEventListener("abort", () => { count++ })
            controller.signal.addEventListener("abort", () => { count++ })

            controller.abort()
            pw.expect(count).toBe(3)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected '3' to be '3'" },
          ],
        }),
      ])
    })
  })

  describe("Response constructor", () => {
    test("new Response() should create response with properties", async () => {
      await expect(
        runTest(
          `
            const response = new Response("test body", { status: 201, statusText: "Created" })

            pw.expect(response.status).toBe(201)
            pw.expect(response.statusText).toBe("Created")
            pw.expect(response.ok).toBe(true)
            pw.expect(typeof response.json).toBe("function")
            pw.expect(typeof response.text).toBe("function")
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected '201' to be '201'" },
            { status: "pass", message: "Expected 'Created' to be 'Created'" },
            { status: "pass", message: "Expected 'true' to be 'true'" },
            { status: "pass", message: "Expected 'function' to be 'function'" },
            { status: "pass", message: "Expected 'function' to be 'function'" },
          ],
        }),
      ])
    })

    test("Response constructor is available globally", async () => {
      await expect(
        runTest(
          `
            pw.expect(typeof Response).toBe("function")

            const resp = new Response("data", { status: 200 })
            pw.expect(resp.status).toBe(200)
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          undefined
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          expectResults: [
            { status: "pass", message: "Expected 'function' to be 'function'" },
            { status: "pass", message: "Expected '200' to be '200'" },
          ],
        }),
      ])
    })
  })

  describe("Edge cases", () => {
    test("multiple HTTP status codes should return correct ok status", async () => {
      const statuses = [200, 201, 204, 400, 404, 500]

      for (const status of statuses) {
        const mockFetch: HoppFetchHook = vi.fn(async () => {
          return new Response("data", { status })
        })

        await expect(
          runTest(
            `
              const response = await hopp.fetch("https://api.example.com/data")
              pw.expect(response.status).toBe(${status})
              pw.expect(response.ok).toBe(${status >= 200 && status < 300})
            `,
            { global: [], selected: [] },
            undefined,
            undefined,
            mockFetch
          )()
        ).resolves.toBeRight()
      }
    })

    test("empty response body should be handled correctly", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(null, { status: 204 })
      })

      await expect(
        runTest(
          `
            hopp.test("empty body handled", async () => {
              const response = await hopp.fetch("https://api.example.com/delete")
              pw.expect(response.status).toBe(204)

              const text = await response.text()
              pw.expect(text).toBe("")
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "empty body handled",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})
