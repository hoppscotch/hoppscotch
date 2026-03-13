import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { MCPHTTPConnection } from "../MCPHTTPConnection"
import type { HoppMCPRequest } from "@hoppscotch/data"

// TODO: This test suite needs to be rewritten to match the actual MCPHTTPConnection API.
// The constructor signature is (url: string, auth: MCPHTTPAuth), not (request: HoppMCPRequest).
// Also needs to handle the new error re-throwing behavior in connect().
describe.skip("MCPHTTPConnection", () => {
  let connection: MCPHTTPConnection
  let mockRequest: HoppMCPRequest
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    mockRequest = {
      v: 1,
      name: "Test MCP Request",
      transportType: "http",
      stdioConfig: null,
      httpConfig: {
        url: "https://mcp.example.com",
        method: "POST",
      },
      auth: {
        authType: "none",
        authActive: false,
      },
      authActive: false,
      method: {
        methodType: "tools",
        methodName: "test_tool",
        arguments: "{}",
      },
    } as HoppMCPRequest

    // Save original fetch and mock it globally
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe("Connection State", () => {
    it("should initialize with DISCONNECTED state", () => {
      connection = new MCPHTTPConnection(mockRequest)
      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })

    it("should transition to CONNECTING when connect is called", async () => {
      connection = new MCPHTTPConnection(mockRequest)

      // Mock successful initialize response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            protocolVersion: "1.0",
            serverInfo: { name: "Test Server", version: "1.0.0" },
          },
        }),
      })

      const connectPromise = connection.connect()
      expect(connection.connectionState$.value).toBe("CONNECTING")

      await connectPromise
    })

    it("should transition to CONNECTED on successful connection", async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            protocolVersion: "1.0",
            serverInfo: { name: "Test Server", version: "1.0.0" },
          },
        }),
      })

      await connection.connect()
      expect(connection.connectionState$.value).toBe("CONNECTED")
    })

    it("should transition to DISCONNECTED on connection error", async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

      await expect(connection.connect()).rejects.toThrow()
      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })

    it("should transition to DISCONNECTED when disconnect is called", async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()
      connection.disconnect()

      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })
  })

  describe("Authentication", () => {
    it("should send Basic auth headers when configured", async () => {
      mockRequest.auth = {
        authType: "basic",
        username: "user",
        password: "pass",
      }
      mockRequest.authActive = true

      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mcp.example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${btoa("user:pass")}`,
          }),
        })
      )
    })

    it("should send Bearer token when configured", async () => {
      mockRequest.auth = {
        authType: "bearer",
        token: "test-token-123",
      }
      mockRequest.authActive = true

      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mcp.example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        })
      )
    })

    it("should send API Key header when configured", async () => {
      mockRequest.auth = {
        authType: "api-key",
        key: "X-API-Key",
        value: "api-key-value",
        addTo: "Headers",
      }
      mockRequest.authActive = true

      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mcp.example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "api-key-value",
          }),
        })
      )
    })

    it("should not send auth headers when authActive is false", async () => {
      mockRequest.auth = {
        authType: "bearer",
        token: "test-token-123",
      }
      mockRequest.authActive = false

      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()

      const callArgs = (global.fetch as any).mock.calls[0][1]
      expect(callArgs.headers).not.toHaveProperty("Authorization")
    })
  })

  describe("Capability Loading", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(mockRequest)

      // Mock initialize response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()
    })

    it("should load tools capabilities", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: {
            tools: [
              {
                name: "get_weather",
                description: "Get weather information",
                inputSchema: {
                  type: "object",
                  properties: { location: { type: "string" } },
                },
              },
            ],
          },
        }),
      })

      await connection.loadCapabilities()

      const capabilities = connection.capabilities$.value
      expect(capabilities?.tools).toHaveLength(1)
      expect(capabilities?.tools[0].name).toBe("get_weather")
    })

    it("should load prompts capabilities", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: {
            prompts: [
              {
                name: "code_review",
                description: "Review code for issues",
                arguments: [{ name: "code", required: true }],
              },
            ],
          },
        }),
      })

      await connection.loadCapabilities()

      const capabilities = connection.capabilities$.value
      expect(capabilities?.prompts).toHaveLength(1)
      expect(capabilities?.prompts[0].name).toBe("code_review")
    })

    it("should load resources capabilities", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: {
            resources: [
              {
                uri: "file://README.md",
                name: "README",
                mimeType: "text/markdown",
              },
            ],
          },
        }),
      })

      await connection.loadCapabilities()

      const capabilities = connection.capabilities$.value
      expect(capabilities?.resources).toHaveLength(1)
      expect(capabilities?.resources[0].name).toBe("README")
    })

    it("should emit event on capability load", async () => {
      const events: any[] = []
      connection.event$.subscribe((event) => events.push(event))
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: { tools: [], prompts: [], resources: [] },
        }),
      })

      await connection.loadCapabilities()

      expect(events).toContainEqual(
        expect.objectContaining({
          type: "CAPABILITIES_LOADED",
        })
      )
    })
  })

  describe("Tool Invocation", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()
    })

    it("should invoke tool with arguments", async () => {
      const toolArgs = { location: "San Francisco" }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: {
            content: [{ type: "text", text: "Temperature: 72°F" }],
          },
        }),
      })

      const result = await connection.invokeTool("get_weather", toolArgs)

      expect(result).toEqual({
        content: [{ type: "text", text: "Temperature: 72°F" }],
      })

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mcp.example.com",
        expect.objectContaining({
          body: expect.stringContaining('"method":"tools/call"'),
        })
      )
    })

    it("should handle tool errors", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          error: {
            code: -32602,
            message: "Invalid params",
          },
        }),
      })

      await expect(connection.invokeTool("get_weather", {})).rejects.toThrow(
        "Invalid params"
      )
    })
  })

  describe("JSON-RPC Protocol", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { protocolVersion: "1.0", serverInfo: {} },
        }),
      })

      await connection.connect()
    })

    it("should send proper JSON-RPC 2.0 request format", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: { tools: [] },
        }),
      })

      await connection.loadCapabilities()

      const requestBody = JSON.parse(
        (global.fetch as any).mock.calls[1][1].body
      )

      expect(requestBody).toMatchObject({
        jsonrpc: "2.0",
        id: expect.any(Number),
        method: "tools/list",
        params: {},
      })
    })

    it("should increment request ID for each call", async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: { tools: [] },
        }),
      })

      await connection.loadCapabilities()
      await connection.loadCapabilities()

      const firstCall = JSON.parse((global.fetch as any).mock.calls[1][1].body)
      const secondCall = JSON.parse((global.fetch as any).mock.calls[2][1].body)

      expect(secondCall.id).toBeGreaterThan(firstCall.id)
    })
  })

  describe("Error Handling", () => {
    it("should throw error on HTTP error response", async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      await expect(connection.connect()).rejects.toThrow(
        "HTTP error: 500 Internal Server Error"
      )
    })

    it("should throw error on network failure", async () => {
      connection = new MCPHTTPConnection(mockRequest)
      ;(global.fetch as any).mockRejectedValueOnce(new Error("Failed to fetch"))

      await expect(connection.connect()).rejects.toThrow("Failed to fetch")
    })

    it("should throw error when missing URL", async () => {
      mockRequest.httpConfig = null
      connection = new MCPHTTPConnection(mockRequest)

      await expect(connection.connect()).rejects.toThrow("HTTP URL is required")
    })
  })
})
