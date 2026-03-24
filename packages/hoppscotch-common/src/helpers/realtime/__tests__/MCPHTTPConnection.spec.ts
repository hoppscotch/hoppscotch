import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MCPHTTPConnection } from "../MCPHTTPConnection"

const { logEvent } = vi.hoisted(() => ({
  logEvent: vi.fn(),
}))

vi.mock("~/platform", () => ({
  platform: {
    analytics: {
      logEvent,
    },
  },
}))

type JSONRPCSuccessResponse<T> = {
  jsonrpc: "2.0"
  id: number
  result: T
}

const makeSuccessResponse = <T>(id: number, result: T): Response =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue({
      jsonrpc: "2.0",
      id,
      result,
    } satisfies JSONRPCSuccessResponse<T>),
  }) as unknown as Response

const makeErrorResponse = (id: number, message: string): Response =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message,
      },
    }),
  }) as unknown as Response

describe("MCPHTTPConnection", () => {
  const fetchMock = vi.fn<typeof fetch>()
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("starts disconnected and transitions through connect lifecycle", async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeSuccessResponse(1, {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "Example MCP",
            version: "1.0.0",
          },
        })
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        statusText: "Accepted",
      } as Response)
      .mockResolvedValueOnce(makeSuccessResponse(2, { tools: [] }))
      .mockResolvedValueOnce(makeSuccessResponse(3, { prompts: [] }))
      .mockResolvedValueOnce(makeSuccessResponse(4, { resources: [] }))

    const connection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "none",
    })

    expect(connection.connectionState$.value).toBe("DISCONNECTED")

    const connectPromise = connection.connect()

    expect(connection.connectionState$.value).toBe("CONNECTING")

    await connectPromise

    expect(connection.connectionState$.value).toBe("CONNECTED")
    expect(logEvent).toHaveBeenCalledWith({
      type: "HOPP_REQUEST_RUN",
      platform: "mcp-http",
    })
  })

  it("builds the initialize handshake and initialized notification in JSON-RPC format", async () => {
    fetchMock
      .mockResolvedValueOnce(makeSuccessResponse(1, { serverInfo: {} }))
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        statusText: "Accepted",
      } as Response)
      .mockResolvedValueOnce(makeSuccessResponse(2, { tools: [] }))
      .mockResolvedValueOnce(makeSuccessResponse(3, { prompts: [] }))
      .mockResolvedValueOnce(makeSuccessResponse(4, { resources: [] }))

    const connection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "none",
    })

    await connection.connect()

    expect(fetchMock).toHaveBeenCalledTimes(5)

    const initializeCall = fetchMock.mock.calls[0]
    expect(initializeCall[0]).toBe("https://mcp.example.com")
    expect(initializeCall[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const initializeBody = JSON.parse(initializeCall[1]!.body as string)
    expect(initializeBody).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        clientInfo: {
          name: "Hoppscotch",
          version: "1.0.0",
        },
      },
    })

    const initializedCall = fetchMock.mock.calls[1]
    const initializedBody = JSON.parse(initializedCall[1]!.body as string)

    expect(initializedBody).toEqual({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    })
  })

  it("builds auth headers for basic, bearer, and API key auth", async () => {
    fetchMock.mockResolvedValue(makeSuccessResponse(1, { ok: true }))

    const basicConnection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "basic",
      username: "user",
      password: "pass",
    })
    basicConnection.connectionState$.next("CONNECTED")
    await basicConnection.invokeTool("echo", {})
    expect(fetchMock.mock.calls[0][1]!.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
    })

    fetchMock.mockClear()

    const bearerConnection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "bearer",
      token: "secret-token",
    })
    bearerConnection.connectionState$.next("CONNECTED")
    await bearerConnection.invokeTool("echo", {})
    expect(fetchMock.mock.calls[0][1]!.headers).toMatchObject({
      Authorization: "Bearer secret-token",
    })

    fetchMock.mockClear()

    const headerAPIKeyConnection = new MCPHTTPConnection(
      "https://mcp.example.com",
      {
        type: "api-key",
        key: "X-API-Key",
        value: "api-value",
        addTo: "HEADERS",
      }
    )
    headerAPIKeyConnection.connectionState$.next("CONNECTED")
    await headerAPIKeyConnection.invokeTool("echo", {})
    expect(fetchMock.mock.calls[0][1]!.headers).toMatchObject({
      "X-API-Key": "api-value",
    })
  })

  it("supports API keys in query parameters", async () => {
    fetchMock.mockResolvedValue(makeSuccessResponse(1, { ok: true }))

    const connection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "api-key",
      key: "api_key",
      value: "query-secret",
      addTo: "QUERY_PARAMS",
    })

    connection.connectionState$.next("CONNECTED")
    await connection.invokeTool("echo", {})

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://mcp.example.com/?api_key=query-secret"
    )
  })

  it("loads capabilities and updates the capability stream", async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeSuccessResponse(1, {
          tools: [
            {
              name: "get_weather",
              description: "Get weather",
              inputSchema: {
                type: "object",
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        makeSuccessResponse(2, {
          prompts: [
            {
              name: "summarize",
              description: "Summarize text",
              arguments: [
                {
                  name: "text",
                  required: true,
                },
              ],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        makeSuccessResponse(3, {
          resources: [
            {
              uri: "file:///tmp/example.txt",
              name: "Example",
            },
          ],
        })
      )

    const connection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "none",
    })

    connection.connectionState$.next("CONNECTED")

    await connection.loadCapabilities()

    expect(connection.capabilities$.value).toEqual({
      tools: [
        {
          name: "get_weather",
          description: "Get weather",
          inputSchema: {
            type: "object",
          },
        },
      ],
      prompts: [
        {
          name: "summarize",
          description: "Summarize text",
          arguments: [
            {
              name: "text",
              required: true,
            },
          ],
        },
      ],
      resources: [
        {
          uri: "file:///tmp/example.txt",
          name: "Example",
        },
      ],
    })
  })

  it("formats tool invocation requests as JSON-RPC tools/call messages", async () => {
    fetchMock.mockResolvedValueOnce(
      makeSuccessResponse(1, {
        content: [
          {
            type: "text",
            text: "Sunny",
          },
        ],
      })
    )

    const connection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "none",
    })

    connection.connectionState$.next("CONNECTED")

    const response = await connection.invokeTool("get_weather", {
      city: "Colombo",
    })

    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: "Sunny",
        },
      ],
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(requestBody).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_weather",
        arguments: {
          city: "Colombo",
        },
      },
    })
  })

  it("disconnects on connect failures and surfaces invocation errors without dropping the session", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"))

    const failingConnection = new MCPHTTPConnection("https://mcp.example.com", {
      type: "none",
    })

    await expect(failingConnection.connect()).rejects.toThrow("Network failure")
    expect(failingConnection.connectionState$.value).toBe("DISCONNECTED")

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(makeErrorResponse(1, "Tool failed"))

    const connectedConnection = new MCPHTTPConnection(
      "https://mcp.example.com",
      {
        type: "none",
      }
    )

    connectedConnection.connectionState$.next("CONNECTED")

    await expect(
      connectedConnection.invokeTool("explode", {
        force: true,
      })
    ).rejects.toThrow("Tool failed")

    expect(connectedConnection.connectionState$.value).toBe("CONNECTED")
  })
})
