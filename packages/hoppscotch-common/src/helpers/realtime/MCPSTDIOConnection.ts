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

export interface MCPSTDIOConfig {
  command: string
  args: string[]
  env: Record<string, string>
}

/**
 * STDIO-based MCP connection.
 *
 * IMPORTANT: STDIO transport requires spawning child processes, which cannot be done
 * directly in a browser environment. This connection type requires either:
 * 1. Hoppscotch Desktop App (Electron/Tauri)
 * 2. Hoppscotch Agent running locally
 *
 * For browser-based usage, use MCPHTTPConnection instead.
 */
export class MCPSTDIOConnection extends MCPConnection {
  private config: MCPSTDIOConfig
  private requestId = 0
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >()

  // Reference to the agent/desktop API that can spawn processes
  private processAPI: any = null

  constructor(config: MCPSTDIOConfig) {
    super()
    this.config = config
  }

  async connect(): Promise<void> {
    try {
      this.connectionState$.next("CONNECTING")
      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      // Check if we have access to process spawning capability
      // This would be available through the agent or desktop app
      if (
        typeof window !== "undefined" &&
        (window as any).__HOPPSCOTCH_AGENT__
      ) {
        this.processAPI = (window as any).__HOPPSCOTCH_AGENT__
      } else if (
        typeof window !== "undefined" &&
        (window as any).__TAURI_IPC__
      ) {
        // Tauri-based desktop app
        this.processAPI = (window as any).__TAURI_IPC__
      } else {
        throw new Error(
          "STDIO transport requires Hoppscotch Agent or Desktop App. " +
            "Please use HTTP transport for browser-based connections, or install the agent/desktop app."
        )
      }

      // Spawn the MCP server process
      await this.spawnProcess()

      // Initialize the MCP connection
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
      platform: "mcp-stdio",
    })
  }

  disconnect(): void {
    // Reject all pending requests
    const disconnectError = new Error("Connection closed")
    this.pendingRequests.forEach((pending) => {
      pending.reject(disconnectError)
    })
    this.pendingRequests.clear()

    // Clean up the spawned process
    if (this.processAPI && this.processAPI.killProcess) {
      this.processAPI.killProcess()
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

  private async spawnProcess(): Promise<void> {
    if (!this.processAPI || !this.processAPI.spawnMCPServer) {
      throw new Error("Process API not available")
    }

    // Spawn the process and set up message handlers
    await this.processAPI.spawnMCPServer({
      command: this.config.command,
      args: this.config.args,
      env: this.config.env,
      onMessage: (message: string) => this.handleMessage(message),
      onError: (error: string) => this.handleError(new Error(error)),
    })
  }

  private handleMessage(message: string): void {
    try {
      const data: MCPJSONRPCResponse = JSON.parse(message)

      if (typeof data.id === "number") {
        const pending = this.pendingRequests.get(data.id)
        if (pending) {
          this.pendingRequests.delete(data.id)

          if (data.error) {
            pending.reject(new Error(`MCP Error: ${data.error.message}`))
          } else {
            pending.resolve(data.result)
          }
        }
      }
    } catch (error) {
      this.handleError(error as MCPErrorMessage)
    }
  }

  private async sendNotification(
    method: string,
    params: unknown
  ): Promise<void> {
    if (!this.processAPI || !this.processAPI.sendMessage) {
      throw new Error("Process API not available")
    }

    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    }

    await this.processAPI.sendMessage(JSON.stringify(notification))
  }

  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    if (!this.processAPI || !this.processAPI.sendMessage) {
      throw new Error("Process API not available")
    }

    const id = ++this.requestId
    const request: MCPJSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      // Send the request to the spawned process
      this.processAPI
        .sendMessage(JSON.stringify(request))
        .catch((error: Error) => {
          this.pendingRequests.delete(id)
          reject(error)
        })

      // Set a timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }
      }, 30000) // 30 second timeout
    })
  }
}
