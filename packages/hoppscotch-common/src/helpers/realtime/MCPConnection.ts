import { BehaviorSubject, Subject } from "rxjs"

export type MCPErrorMessage = Error | string

export type MCPEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "CAPABILITIES_LOADED"; capabilities: MCPCapabilities }
  | { type: "METHOD_INVOKED"; method: string; arguments: unknown }
  | { type: "RESPONSE_RECEIVED"; response: unknown }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: MCPErrorMessage }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export interface MCPTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
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

export abstract class MCPConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  event$: Subject<MCPEvent> = new Subject()
  capabilities$: BehaviorSubject<MCPCapabilities | null> =
    new BehaviorSubject<MCPCapabilities | null>(null)

  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
  }

  protected addEvent(event: MCPEvent) {
    this.event$.next(event)
  }

  abstract connect(): Promise<void>
  abstract disconnect(): void
  abstract loadCapabilities(): Promise<void>
  abstract invokeTool(name: string, args: unknown): Promise<unknown>
  abstract invokePrompt(name: string, args: unknown): Promise<unknown>
  abstract readResource(uri: string): Promise<unknown>

  protected handleError(error: MCPErrorMessage) {
    // Don't emit error events for user-initiated aborts (e.g., during disconnect)
    if (error instanceof Error && error.name === "AbortError") {
      return
    }

    this.connectionState$.next("DISCONNECTED")
    this.capabilities$.next(null)
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error,
    })
    this.addEvent({
      time: Date.now(),
      type: "DISCONNECTED",
      manual: false,
    })
  }
}
