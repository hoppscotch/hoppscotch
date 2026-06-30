import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { MCPHTTPConnection } from "../MCPHTTPConnection"
import type { MCPHTTPAuth } from "../MCPHTTPConnection"

vi.mock("~/platform", () => ({
  platform: { analytics: { logEvent: vi.fn() } },
}))

describe("MCPHTTPConnection", () => {
  const TEST_URL = "https://mcp.example.com"
  let connection: MCPHTTPConnection
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  const mockInitializeResponse = () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "Test Server", version: "1.0.0" },
        },
      }),
    })
    // notifications/initialized response
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    // auto-loadCapabilities: tools/list, prompts/list, resources/list
    for (let i = 0; i < 3; i++) {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: i + 2,
          result: { tools: [], prompts: [], resources: [] },
        }),
      })
    }
  }

  describe("Connection State", () => {
    it("should initialize with DISCONNECTED state", () => {
      connection = new MCPHTTPConnection(TEST_URL)
      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })

    it("should transition to CONNECTING when connect is called", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()

      const connectPromise = connection.connect()
      expect(connection.connectionState$.value).toBe("CONNECTING")

      await connectPromise
    })

    it("should transition to CONNECTED on successful connection", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()

      await connection.connect()
      expect(connection.connectionState$.value).toBe("CONNECTED")
    })

    it("should transition to DISCONNECTED on connection error", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error")
      )

      await expect(connection.connect()).rejects.toThrow()
      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })

    it("should transition to DISCONNECTED when disconnect is called", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()

      await connection.connect()
      connection.disconnect()

      expect(connection.connectionState$.value).toBe("DISCONNECTED")
    })
  })

  describe("Authentication", () => {
    it("should send Basic auth headers when configured", async () => {
      const auth: MCPHTTPAuth = {
        type: "basic",
        username: "user",
        password: "pass",
      }
      connection = new MCPHTTPConnection(TEST_URL, auth)
      mockInitializeResponse()

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${btoa("user:pass")}`,
          }),
        })
      )
    })

    it("should send Bearer token when configured", async () => {
      const auth: MCPHTTPAuth = {
        type: "bearer",
        token: "test-token-123",
      }
      connection = new MCPHTTPConnection(TEST_URL, auth)
      mockInitializeResponse()

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        })
      )
    })

    it("should add API Key header when configured for HEADERS", async () => {
      const auth: MCPHTTPAuth = {
        type: "api-key",
        key: "X-API-Key",
        value: "api-key-value",
        addTo: "HEADERS",
      }
      connection = new MCPHTTPConnection(TEST_URL, auth)
      mockInitializeResponse()

      await connection.connect()

      expect(global.fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "api-key-value",
          }),
        })
      )
    })

    it("should not send auth headers for type none", async () => {
      connection = new MCPHTTPConnection(TEST_URL, { type: "none" })
      mockInitializeResponse()

      await connection.connect()

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][1]
      expect(callArgs.headers).not.toHaveProperty("Authorization")
    })
  })

  describe("Capability Loading", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()
      await connection.connect()
    })

    it("should load tools capabilities", async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 10,
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

    it("should emit CAPABILITIES_LOADED event on capability load", async () => {
      const events: any[] = []
      connection.event$.subscribe((event) => events.push(event))
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 10,
          result: { tools: [], prompts: [], resources: [] },
        }),
      })

      await connection.loadCapabilities()

      expect(events).toContainEqual(
        expect.objectContaining({ type: "CAPABILITIES_LOADED" })
      )
    })

    it("should partial-load when only some endpoints succeed", async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: 10,
            result: { tools: [{ name: "tool1", inputSchema: {} }] },
          }),
        })
        .mockRejectedValueOnce(new Error("prompts not supported"))
        .mockRejectedValueOnce(new Error("resources not supported"))

      await connection.loadCapabilities()

      const capabilities = connection.capabilities$.value
      expect(capabilities?.tools).toHaveLength(1)
      expect(capabilities?.prompts).toHaveLength(0)
      expect(capabilities?.resources).toHaveLength(0)
    })
  })

  describe("Tool Invocation", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()
      await connection.connect()
    })

    it("should invoke tool and return result", async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 10,
          result: { content: [{ type: "text", text: "72°F" }] },
        }),
      })

      const result = await connection.invokeTool("get_weather", {
        location: "SF",
      })

      expect(result).toEqual({ content: [{ type: "text", text: "72°F" }] })
      expect(global.fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          body: expect.stringContaining('"method":"tools/call"'),
        })
      )
    })

    it("should throw on tool error response", async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 10,
          error: { code: -32602, message: "Invalid params" },
        }),
      })

      await expect(connection.invokeTool("get_weather", {})).rejects.toThrow(
        "Invalid params"
      )
    })
  })

  describe("JSON-RPC Protocol", () => {
    beforeEach(async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()
      await connection.connect()
    })

    it("should send proper JSON-RPC 2.0 request format", async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 10,
          result: { tools: [], prompts: [], resources: [] },
        }),
      })

      await connection.loadCapabilities()

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const callAfterInit = fetchMock.mock.calls.find((call) => {
        const body = JSON.parse(call[1].body)
        return body.method === "tools/list"
      })

      expect(callAfterInit).toBeDefined()
      const body = JSON.parse(callAfterInit![1].body)
      expect(body).toMatchObject({
        jsonrpc: "2.0",
        id: expect.any(Number),
        method: "tools/list",
        params: {},
      })
    })
  })

  describe("Error Handling", () => {
    it("should throw on HTTP error response", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      await expect(connection.connect()).rejects.toThrow("500")
    })

    it("should throw on network failure", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Failed to fetch")
      )

      await expect(connection.connect()).rejects.toThrow("Failed to fetch")
    })
  })

  describe("Disconnect", () => {
    it("should emit DISCONNECTED event with manual:true on disconnect()", async () => {
      connection = new MCPHTTPConnection(TEST_URL)
      mockInitializeResponse()
      await connection.connect()

      const events: any[] = []
      connection.event$.subscribe((e) => events.push(e))

      connection.disconnect()

      expect(events).toContainEqual(
        expect.objectContaining({ type: "DISCONNECTED", manual: true })
      )
    })
  })
})
