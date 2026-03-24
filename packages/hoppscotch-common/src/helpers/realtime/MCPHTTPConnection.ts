import { platform } from "~/platform"
import {
  MCPCapabilities,
  MCPConnection,
  MCPErrorMessage,
  MCPPrompt,
  MCPResource,
  MCPTool,
} from "./MCPConnection"

type JSONRPCRequest = {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: unknown
}

type JSONRPCNotification = {
  jsonrpc: "2.0"
  method: string
  params?: unknown
}

type JSONRPCResponse<T = unknown> = {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

type CapabilityListResponse<T> = Record<string, T[]>

export type MCPHTTPAuth =
  | { type: "none" }
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; token: string }
  | {
      type: "api-key"
      key: string
      value: string
      addTo: "HEADERS" | "QUERY_PARAMS"
    }

const MCP_PROTOCOL_VERSION = "2024-11-05"
const HOPPSCOTCH_CLIENT_INFO = {
  name: "Hoppscotch",
  version: "1.0.0",
}

export class MCPHTTPConnection extends MCPConnection {
  private requestId = 0
  private readonly abortControllers = new Map<number, AbortController>()

  constructor(
    private readonly url: string,
    private readonly auth: MCPHTTPAuth = { type: "none" }
  ) {
    super()
  }

  async connect(): Promise<void> {
    try {
      this.connectionState$.next("CONNECTING")
      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      await this.sendRequest("initialize", {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          roots: {
            listChanged: true,
          },
          sampling: {},
        },
        clientInfo: HOPPSCOTCH_CLIENT_INFO,
      })

      await this.sendNotification("notifications/initialized", {})

      this.connectionState$.next("CONNECTED")
      this.addEvent({
        time: Date.now(),
        type: "CONNECTED",
      })

      await this.loadCapabilities()

      platform.analytics?.logEvent({
        type: "HOPP_REQUEST_RUN",
        platform: "mcp-http",
      })
    } catch (error) {
      const normalizedError = this.normalizeError(error)
      this.reportError(normalizedError)
      throw normalizedError
    }
  }

  disconnect() {
    this.abortControllers.forEach((controller) => controller.abort())
    this.abortControllers.clear()
    this.connectionState$.next("DISCONNECTED")
    this.setCapabilities(null)
    this.addEvent({
      time: Date.now(),
      type: "DISCONNECTED",
      manual: true,
    })
  }

  async loadCapabilities(): Promise<void> {
    this.assertConnected()

    const [toolsResult, promptsResult, resourcesResult] =
      await Promise.allSettled([
        this.sendRequest<CapabilityListResponse<MCPTool>>("tools/list", {}),
        this.sendRequest<CapabilityListResponse<MCPPrompt>>("prompts/list", {}),
        this.sendRequest<CapabilityListResponse<MCPResource>>(
          "resources/list",
          {}
        ),
      ])

    const capabilities: MCPCapabilities = {
      tools: this.extractCapabilityList(toolsResult, "tools"),
      prompts: this.extractCapabilityList(promptsResult, "prompts"),
      resources: this.extractCapabilityList(resourcesResult, "resources"),
    }

    this.setCapabilities(capabilities)
    this.addEvent({
      time: Date.now(),
      type: "CAPABILITIES_LOADED",
      capabilities,
    })
  }

  async invokeTool(name: string, args: unknown): Promise<unknown> {
    return await this.invokeMethod("tools/call", name, {
      name,
      arguments: args,
    })
  }

  async invokePrompt(name: string, args: unknown): Promise<unknown> {
    return await this.invokeMethod("prompts/get", name, {
      name,
      arguments: args,
    })
  }

  async readResource(uri: string): Promise<unknown> {
    return await this.invokeMethod("resources/read", uri, {
      uri,
    })
  }

  private async invokeMethod(
    rpcMethod: string,
    methodLabel: string,
    params: unknown
  ) {
    this.assertConnected()

    try {
      this.addEvent({
        time: Date.now(),
        type: "METHOD_INVOKED",
        method: methodLabel,
        arguments: params,
      })

      const response = await this.sendRequest(rpcMethod, params)

      this.addEvent({
        time: Date.now(),
        type: "RESPONSE_RECEIVED",
        response,
      })

      return response
    } catch (error) {
      const normalizedError = this.normalizeError(error)
      this.reportError(normalizedError, {
        disconnect: false,
      })
      throw normalizedError
    }
  }

  private async sendNotification(method: string, params: unknown) {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params,
    }

    const response = await fetch(this.buildRequestUrl(), {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(notification),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  private async sendRequest<T>(method: string, params: unknown): Promise<T> {
    const id = ++this.requestId
    const abortController = new AbortController()
    this.abortControllers.set(id, abortController)

    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    }

    try {
      const response = await fetch(this.buildRequestUrl(), {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(request),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const payload = (await response.json()) as JSONRPCResponse<T>

      if (payload.error) {
        throw new Error(`MCP Error: ${payload.error.message}`)
      }

      if (!("result" in payload)) {
        throw new Error(`Missing JSON-RPC result for method "${method}"`)
      }

      return payload.result as T
    } finally {
      this.abortControllers.delete(id)
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    switch (this.auth.type) {
      case "basic": {
        headers.Authorization = `Basic ${btoa(
          `${this.auth.username}:${this.auth.password}`
        )}`
        break
      }
      case "bearer": {
        headers.Authorization = `Bearer ${this.auth.token}`
        break
      }
      case "api-key": {
        if (this.auth.addTo === "HEADERS") {
          headers[this.auth.key] = this.auth.value
        }
        break
      }
      case "none":
      default:
        break
    }

    return headers
  }

  private buildRequestUrl() {
    if (this.auth.type === "api-key" && this.auth.addTo === "QUERY_PARAMS") {
      try {
        const requestUrl = new URL(this.url)
        requestUrl.searchParams.set(this.auth.key, this.auth.value)
        return requestUrl.toString()
      } catch {
        throw new Error("Invalid MCP server URL")
      }
    }

    return this.url
  }

  private assertConnected() {
    if (this.connectionState$.value !== "CONNECTED") {
      throw new Error("MCP connection is not connected")
    }
  }

  private extractCapabilityList<T>(
    result: PromiseSettledResult<CapabilityListResponse<T>>,
    key: string
  ): T[] {
    if (result.status !== "fulfilled") {
      return []
    }

    const value = result.value[key]
    return Array.isArray(value) ? value : []
  }

  private normalizeError(error: unknown): MCPErrorMessage {
    return error instanceof Error ? error : String(error)
  }
}
