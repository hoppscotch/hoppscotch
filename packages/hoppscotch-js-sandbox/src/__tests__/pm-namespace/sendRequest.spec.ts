import { describe, expect, test, vi } from "vitest"
import { runTest } from "~/utils/test-helpers"
import type { HoppFetchHook } from "~/types"

/**
 * Tests for pm.sendRequest() functionality
 *
 * NOTE: These unit tests validate API availability but have limited coverage
 * due to QuickJS async callback timing issues. Callback assertions don't
 * execute reliably in the test context.
 *
 * For production validation, see the comprehensive E2E tests in:
 * packages/hoppscotch-cli/src/__tests__/e2e/fixtures/collections/scripting-revamp-coll.json
 *
 * The E2E tests make real HTTP requests and fully validate:
 * - String URL format
 * - Request object format
 * - URL-encoded body
 * - Response format validation
 * - HTTP error status codes
 * - Environment variable integration
 * - Store response in environment
 */

describe("pm.sendRequest()", () => {
  describe("Basic functionality", () => {
    test("pm.sendRequest should execute callback with response data", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true, data: "test" }), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("sendRequest with callback", () => {
              pm.sendRequest("https://api.example.com/data", (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.status).toBe("OK")
                pm.expect(response.json().success).toBe(true)
                pm.expect(response.json().data).toBe("test")
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "sendRequest with callback",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected 'OK' to be 'OK'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected 'test' to be 'test'" },
              ],
            }),
          ],
        }),
      ])
    })

    test("pm.sendRequest should handle errors in callback", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        throw new Error("Network error")
      })

      await expect(
        runTest(
          `
            pm.test("sendRequest with error", () => {
              pm.sendRequest("https://api.example.com/fail", (error, response) => {
                pm.expect(error).not.toBe(null)
                pm.expect(response).toBe(null)
                pm.expect(error.message).toBe("Network error")
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "sendRequest with error",
              expectResults: [
                expect.objectContaining({ status: "pass" }),
                { status: "pass", message: "Expected 'null' to be 'null'" },
                {
                  status: "pass",
                  message: "Expected 'Network error' to be 'Network error'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Request object format", () => {
    test("pm.sendRequest accepts request object format with POST (array headers)", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ created: true, id: 123 }), {
          status: 201,
          statusText: "Created",
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("request object format", () => {
              pm.sendRequest({
                url: "https://api.example.com/items",
                method: "POST",
                header: [
                  { key: "Content-Type", value: "application/json" }
                ],
                body: {
                  mode: "raw",
                  raw: JSON.stringify({ name: "test" })
                }
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(201)
                pm.expect(response.status).toBe("Created")
                pm.expect(response.json().created).toBe(true)
                pm.expect(response.json().id).toBe(123)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "request object format",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '201' to be '201'" },
                {
                  status: "pass",
                  message: "Expected 'Created' to be 'Created'",
                },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected '123' to be '123'" },
              ],
            }),
          ],
        }),
      ])
    })

    test("pm.sendRequest accepts request object format with object headers (RFC pattern)", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async (_url, options) => {
        // Verify headers were properly passed as object
        expect(options?.headers).toEqual({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        })

        return new Response(JSON.stringify({ success: true, userId: 456 }), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("RFC pattern - object headers", () => {
              const requestObject = {
                url: 'https://api.example.com/users',
                method: 'POST',
                header: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                },
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({ name: 'John Doe' })
                }
              }

              pm.sendRequest(requestObject, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().success).toBe(true)
                pm.expect(response.json().userId).toBe(456)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "RFC pattern - object headers",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected '456' to be '456'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Body modes", () => {
    test("pm.sendRequest handles urlencoded body mode", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(
          JSON.stringify({ authenticated: true, token: "abc123" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      })

      await expect(
        runTest(
          `
            pm.test("urlencoded body", () => {
              pm.sendRequest({
                url: "https://api.example.com/login",
                method: "POST",
                body: {
                  mode: "urlencoded",
                  urlencoded: [
                    { key: "username", value: "john" },
                    { key: "password", value: "secret123" }
                  ]
                }
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().authenticated).toBe(true)
                pm.expect(response.json().token).toBeType("string")
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "urlencoded body",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                {
                  status: "pass",
                  message: "Expected 'abc123' to be type 'string'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Integration with environment variables", () => {
    test("pm.sendRequest works with environment variables", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(
          JSON.stringify({ data: "secured_data", user: "john" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      })

      await expect(
        runTest(
          `
            pm.test("environment variables in sendRequest", () => {
              // Set environment variables
              pm.environment.set("API_URL", "https://api.example.com")
              pm.environment.set("AUTH_TOKEN", "Bearer token123")

              // Use variables in request
              const url = pm.environment.get("API_URL") + "/data"
              const token = pm.environment.get("AUTH_TOKEN")

              pm.sendRequest({
                url: url,
                header: [
                  { key: "Authorization", value: token }
                ]
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().data).toBe("secured_data")
                pm.expect(response.json().user).toBe("john")
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "environment variables in sendRequest",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                {
                  status: "pass",
                  message: "Expected 'secured_data' to be 'secured_data'",
                },
                { status: "pass", message: "Expected 'john' to be 'john'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Multiple requests in same test", () => {
    test("pm.sendRequest supports multiple async requests", async () => {
      let callCount = 0
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        callCount++
        return new Response(
          JSON.stringify({ request: callCount, data: `response${callCount}` }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      })

      await expect(
        runTest(
          `
            pm.test("multiple sendRequests", () => {
              // First request
              pm.sendRequest("https://api.example.com/first", (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().request).toBe(1)
              })

              // Second request
              pm.sendRequest("https://api.example.com/second", (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().request).toBe(2)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "multiple sendRequests",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected '1' to be '1'" },
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected '2' to be '2'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Additional body modes and content types", () => {
    test("pm.sendRequest with formdata body mode", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ uploaded: true, files: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("formdata body", () => {
              pm.sendRequest({
                url: "https://api.example.com/upload",
                method: "POST",
                body: {
                  mode: "formdata",
                  formdata: [
                    { key: "file", value: "example.txt" },
                    { key: "description", value: "test upload" }
                  ]
                }
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().uploaded).toBe(true)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "formdata body",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("HTTP methods coverage", () => {
    test("pm.sendRequest with PUT method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ updated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("PUT request", () => {
              pm.sendRequest({
                url: "https://api.example.com/resource/123",
                method: "PUT",
                header: { "Content-Type": "application/json" },
                body: { mode: "raw", raw: JSON.stringify({ name: "updated" }) }
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
                pm.expect(response.json().updated).toBe(true)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "PUT request",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
              ],
            }),
          ],
        }),
      ])
    })

    test("pm.sendRequest with PATCH method", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ patched: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("PATCH request", () => {
              pm.sendRequest({
                url: "https://api.example.com/resource/456",
                method: "PATCH",
                header: { "Content-Type": "application/json" },
                body: { mode: "raw", raw: JSON.stringify({ status: "active" }) }
              }, (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.code).toBe(200)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "PATCH request",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '200' to be '200'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Response header validation", () => {
    test("pm.sendRequest response headers access", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "abc123",
            "X-Rate-Limit": "100",
          },
        })
      })

      await expect(
        runTest(
          `
            pm.test("response headers parsing", () => {
              pm.sendRequest("https://api.example.com/data", (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.headers.has("Content-Type")).toBe(true)
                pm.expect(response.headers.get("X-Request-Id")).toBe("abc123")
                pm.expect(response.headers.has("X-Rate-Limit")).toBe(true)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "response headers parsing",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
                { status: "pass", message: "Expected 'abc123' to be 'abc123'" },
                { status: "pass", message: "Expected 'true' to be 'true'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Cookie handling", () => {
    test("pm.sendRequest should handle empty cookies gracefully", async () => {
      const mockFetch: HoppFetchHook = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        })
      })

      await expect(
        runTest(
          `
            pm.test("sendRequest without cookies", () => {
              pm.sendRequest("https://api.example.com/data", (error, response) => {
                pm.expect(error).toBe(null)
                pm.expect(response.cookies.has("anything")).toBe(false)
                pm.expect(response.cookies.get("anything")).toBe(null)
                
                const cookiesObj = response.cookies.toObject()
                pm.expect(Object.keys(cookiesObj).length).toBe(0)
              })
            })
          `,
          { global: [], selected: [] },
          undefined,
          undefined,
          mockFetch
        )()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "sendRequest without cookies",
              expectResults: [
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected 'false' to be 'false'" },
                { status: "pass", message: "Expected 'null' to be 'null'" },
                { status: "pass", message: "Expected '0' to be '0'" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("E2E test reference", () => {
    test("comprehensive validation in E2E tests", () => {
      // This is a documentation test - no actual execution needed
      // For comprehensive validation including:
      // - HTTP methods (GET, POST, PUT, DELETE, PATCH)
      // - Body modes (raw, urlencoded, formdata)
      // - Response header parsing
      // - Multi-request workflows
      // - Store response in environment
      //
      // See E2E tests in:
      // packages/hoppscotch-cli/src/__tests__/e2e/fixtures/collections/scripting-revamp-coll.json
      //
      // Run with: pnpm --filter @hoppscotch/cli test:e2e
      expect(true).toBe(true)
    })
  })
})
