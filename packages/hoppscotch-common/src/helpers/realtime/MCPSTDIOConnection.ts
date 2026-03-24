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
  id?: number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

type CapabilityListResponse<T> = Record<string, T[]>

type MCPProcessSpawnOptions = {
  command: string
  args: string[]
  env: Record<string, string>
  onMessage: (message: string) => void
  onError: (error: string) => void
}

interface MCPProcessAPI {
  spawnMCPServer(options: MCPProcessSpawnOptions): Promise<void>
  sendMessage(message: string): Promise<void>
  killProcess?: () => Promise<void> | void
}

type WindowWithMCPProcessAPI = Window & {
  __HOPPSCOTCH_AGENT__?: MCPProcessAPI
  __TAURI_IPC__?: MCPProcessAPI
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

const MCP_PROTOCOL_VERSION = "2024-11-05"
const HOPPSCOTCH_CLIENT_INFO = {
  name: "Hoppscotch",
  version: "1.0.0",
}

export type MCPSTDIOProcessConfig = {
  command: string
  args: string[]
  env: Record<string, string>
}

export class MCPSTDIOConnection extends MCPConnection {
  private requestId = 0
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private processAPI: MCPProcessAPI | null = null

  constructor(private readonly config: MCPSTDIOProcessConfig) {
    super()
  }

  async connect(): Promise<void> {
    try {
      this.connectionState$.next("CONNECTING")
      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      this.processAPI = this.getProcessAPI()
      await this.processAPI.spawnMCPServer({
        command: this.config.command,
        args: this.config.args,
        env: this.config.env,
        onMessage: (message) => this.handleMessage(message),
        onError: (error) => this.handleError(new Error(error)),
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
        platform: "mcp-stdio",
      })
    } catch (error) {
      const normalizedError = this.normalizeError(error)
      this.reportError(normalizedError)
      throw normalizedError
    }
  }

  async disconnect() {
    const disconnectError = new Error("MCP STDIO connection closed")
    this.pendingRequests.forEach(({ reject, timeoutId }) => {
      clearTimeout(timeoutId)
      reject(disconnectError)
    })
    this.pendingRequests.clear()

    await this.processAPI?.killProcess?.()
    this.processAPI = null

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

  private getProcessAPI(): MCPProcessAPI {
    if (typeof window === "undefined") {
      throw new Error(
        "STDIO transport requires a browser runtime with Hoppscotch Agent or Desktop App support"
      )
    }

    const typedWindow = window as WindowWithMCPProcessAPI
    const processAPI =
      typedWindow.__HOPPSCOTCH_AGENT__ ?? typedWindow.__TAURI_IPC__

    if (!processAPI) {
      throw new Error(
        "STDIO transport requires Hoppscotch Agent or Desktop App. Please switch to HTTP transport or install one of those runtimes."
      )
    }

    return processAPI
  }

  private handleMessage(message: string) {
    try {
      const response = JSON.parse(message) as JSONRPCResponse

      if (typeof response.id !== "number") {
        return
      }

      const pendingRequest = this.pendingRequests.get(response.id)

      if (!pendingRequest) {
        return
      }

      this.pendingRequests.delete(response.id)
      clearTimeout(pendingRequest.timeoutId)

      if (response.error) {
        pendingRequest.reject(new Error(`MCP Error: ${response.error.message}`))
        return
      }

      pendingRequest.resolve(response.result)
    } catch (error) {
      const normalizedError = this.normalizeError(error)
      this.reportError(normalizedError)
    }
  }

  private async sendNotification(method: string, params: unknown) {
    const processAPI = this.ensureProcessAPI()

    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params,
    }

    await processAPI.sendMessage(JSON.stringify(notification))
  }

  private async sendRequest<T>(method: string, params: unknown): Promise<T> {
    const processAPI = this.ensureProcessAPI()
    const id = ++this.requestId

    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    }

    return await new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeoutId,
      })

      processAPI.sendMessage(JSON.stringify(request)).catch((error: Error) => {
        clearTimeout(timeoutId)
        this.pendingRequests.delete(id)
        reject(error)
      })
    })
  }

  private ensureProcessAPI() {
    if (!this.processAPI) {
      throw new Error("MCP STDIO process is not initialized")
    }

    return this.processAPI
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
