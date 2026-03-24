import { BehaviorSubject, Subject } from "rxjs"

export type MCPErrorMessage = Error | string

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export interface MCPTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface MCPPromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: MCPPromptArgument[]
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPCapabilities {
  tools: MCPTool[]
  prompts: MCPPrompt[]
  resources: MCPResource[]
}

export type MCPEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "CAPABILITIES_LOADED"; capabilities: MCPCapabilities }
  | { type: "METHOD_INVOKED"; method: string; arguments: unknown }
  | { type: "RESPONSE_RECEIVED"; response: unknown }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: MCPErrorMessage }
)

export abstract class MCPConnection {
  connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
  event$ = new Subject<MCPEvent>()
  capabilities$ = new BehaviorSubject<MCPCapabilities | null>(null)

  protected addEvent(event: MCPEvent) {
    this.event$.next(event)
  }

  protected setCapabilities(capabilities: MCPCapabilities | null) {
    this.capabilities$.next(capabilities)
  }

  protected reportError(
    error: MCPErrorMessage,
    options: {
      disconnect?: boolean
    } = {}
  ) {
    if (error instanceof Error && error.name === "AbortError") {
      return
    }

    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error,
    })

    if (options.disconnect ?? true) {
      this.connectionState$.next("DISCONNECTED")
      this.setCapabilities(null)
      this.addEvent({
        time: Date.now(),
        type: "DISCONNECTED",
        manual: false,
      })
    }
  }

  abstract connect(): Promise<void>
  abstract disconnect(): void | Promise<void>
  abstract loadCapabilities(): Promise<void>
  abstract invokeTool(name: string, args: unknown): Promise<unknown>
  abstract invokePrompt(name: string, args: unknown): Promise<unknown>
  abstract readResource(uri: string): Promise<unknown>
}
