import {
  MCPConnection,
  MCPCapabilities,
  MCPErrorMessage,
} from "./MCPConnection"
import { platform } from "~/platform"

interface MCPJSONRPCRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: unknown
}

interface MCPJSONRPCResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export interface MCPHTTPAuth {
  type: "none" | "basic" | "bearer" | "api-key"
  username?: string
  password?: string
  token?: string
  key?: string
  value?: string
  addTo?: "HEADERS" | "QUERY_PARAMS"
}

export class MCPHTTPConnection extends MCPConnection {
  private url: string
  private auth: MCPHTTPAuth
  private requestId = 0
  private eventSource: EventSource | null = null
  private abortController: AbortController | null = null

  constructor(url: string, auth: MCPHTTPAuth = { type: "none" }) {
    super()
    this.url = url
    this.auth = auth
  }

  async connect(): Promise<void> {
    try {
      this.connectionState$.next("CONNECTING")
      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      // Initialize connection
      const response = await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: {
            listChanged: true,
          },
          sampling: {},
        },
        clientInfo: {
          name: "Hoppscotch",
          version: "1.0.0",
        },
      })

      if (response) {
        // Send notifications/initialized as per MCP protocol
        await this.sendNotification("notifications/initialized", {})

        this.connectionState$.next("CONNECTED")
        this.addEvent({
          type: "CONNECTED",
          time: Date.now(),
        })

        // Auto-load capabilities after connection
        await this.loadCapabilities()
      }
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
    }

    platform.analytics?.logEvent({
      type: "HOPP_REQUEST_RUN",
      platform: "mcp-http",
    })
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    this.connectionState$.next("DISCONNECTED")
    this.addEvent({
      type: "DISCONNECTED",
      time: Date.now(),
      manual: true,
    })
  }

  async loadCapabilities(): Promise<void> {
    try {
      const results = await Promise.allSettled([
        this.sendRequest("tools/list", {}),
        this.sendRequest("prompts/list", {}),
        this.sendRequest("resources/list", {}),
      ])

      const capabilities: MCPCapabilities = {
        tools:
          results[0].status === "fulfilled"
            ? (results[0].value as any)?.tools || []
            : [],
        prompts:
          results[1].status === "fulfilled"
            ? (results[1].value as any)?.prompts || []
            : [],
        resources:
          results[2].status === "fulfilled"
            ? (results[2].value as any)?.resources || []
            : [],
      }

      this.capabilities$.next(capabilities)
      this.addEvent({
        type: "CAPABILITIES_LOADED",
        time: Date.now(),
        capabilities,
      })
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
    }
  }

  async invokeTool(name: string, args: unknown): Promise<unknown> {
    try {
      this.addEvent({
        type: "METHOD_INVOKED",
        time: Date.now(),
        method: name,
        arguments: args,
      })

      const response = await this.sendRequest("tools/call", {
        name,
        arguments: args,
      })

      this.addEvent({
        type: "RESPONSE_RECEIVED",
        time: Date.now(),
        response,
      })

      return response
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
      throw error
    }
  }

  async invokePrompt(name: string, args: unknown): Promise<unknown> {
    try {
      this.addEvent({
        type: "METHOD_INVOKED",
        time: Date.now(),
        method: name,
        arguments: args,
      })

      const response = await this.sendRequest("prompts/get", {
        name,
        arguments: args,
      })

      this.addEvent({
        type: "RESPONSE_RECEIVED",
        time: Date.now(),
        response,
      })

      return response
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
      throw error
    }
  }

  async readResource(uri: string): Promise<unknown> {
    try {
      this.addEvent({
        type: "METHOD_INVOKED",
        time: Date.now(),
        method: uri,
        arguments: { uri },
      })

      const response = await this.sendRequest("resources/read", {
        uri,
      })

      this.addEvent({
        type: "RESPONSE_RECEIVED",
        time: Date.now(),
        response,
      })

      return response
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
      throw error
    }
  }

  private async sendNotification(
    method: string,
    params: unknown
  ): Promise<void> {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    }

    const headers = this.buildHeaders()
    const requestUrl = this.buildRequestUrl()

    await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(notification),
    })
  }

  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    this.abortController = new AbortController()

    const request: MCPJSONRPCRequest = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    }

    const headers = this.buildHeaders()
    const requestUrl = this.buildRequestUrl()

    const response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: this.abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: MCPJSONRPCResponse = await response.json()

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message}`)
    }

    return data.result
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add authentication headers
    if (
      this.auth.type === "basic" &&
      this.auth.username &&
      this.auth.password
    ) {
      const credentials = btoa(`${this.auth.username}:${this.auth.password}`)
      headers["Authorization"] = `Basic ${credentials}`
    } else if (this.auth.type === "bearer" && this.auth.token) {
      headers["Authorization"] = `Bearer ${this.auth.token}`
    } else if (
      this.auth.type === "api-key" &&
      this.auth.key &&
      this.auth.value
    ) {
      if (this.auth.addTo === "HEADERS") {
        headers[this.auth.key] = this.auth.value
      }
    }

    return headers
  }

  private buildRequestUrl(): string {
    // Build URL with query params for API key if needed
    if (
      this.auth.type === "api-key" &&
      this.auth.addTo === "QUERY_PARAMS" &&
      this.auth.key &&
      this.auth.value
    ) {
      const url = new URL(this.url)
      url.searchParams.set(this.auth.key, this.auth.value)
      return url.toString()
    }

    return this.url
  }
}
