import { BehaviorSubject, Subject } from "rxjs"
import { SIOClientV2, SIOClientV3, SIOClientV4, SIOClient } from "./SIOClients"
import { SIOClientVersion } from "~/newstore/SocketIOSession"
import { platform } from "~/platform"

export const SOCKET_CLIENTS = {
  v2: SIOClientV2,
  v3: SIOClientV3,
  v4: SIOClientV4,
} as const

type SIOAuth = { type: "None" } | { type: "Bearer"; token: string }

export type ConnectionOption = {
  url: string
  path: string
  clientVersion: SIOClientVersion
  auth: SIOAuth | undefined
}

export type SIOMessage = {
  eventName: string
  value: unknown
}

type SIOErrorType = "CONNECTION" | "RECONNECT_ERROR" | "UNKNOWN"
export type SIOError = {
  type: SIOErrorType
  value: unknown
}

export type SIOEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: SIOMessage }
  | { type: "MESSAGE_RECEIVED"; message: SIOMessage }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: SIOError }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class SIOConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  event$: Subject<SIOEvent> = new Subject()
  socket: SIOClient | undefined
  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
  }

  private addEvent(event: SIOEvent) {
    this.event$.next(event)
  }

  connect({ url, path, clientVersion, auth }: ConnectionOption) {
    this.connectionState$.next("CONNECTING")
    this.addEvent({
      time: Date.now(),
      type: "CONNECTING",
    })
    try {
      this.socket = new SOCKET_CLIENTS[clientVersion]()

      if (auth?.type === "Bearer") {
        this.socket.connect(url, {
          path,
          auth: {
            token: auth.token,
          },
        })
      } else {
        this.socket.connect(url, { path })
      }

      this.socket.on("connect", () => {
        this.connectionState$.next("CONNECTED")
        this.addEvent({
          type: "CONNECTED",
          time: Date.now(),
        })
      })

      this.socket.on("*", ({ data }: { data: string[] }) => {
        const [eventName, message] = data
        this.addEvent({
          message: { eventName, value: message },
          type: "MESSAGE_RECEIVED",
          time: Date.now(),
        })
      })

      this.socket.on("connect_error", (error: unknown) => {
        this.handleError(error, "CONNECTION")
      })

      this.socket.on("reconnect_error", (error: unknown) => {
        this.handleError(error, "RECONNECT_ERROR")
      })

      this.socket.on("error", (error: unknown) => {
        this.handleError(error, "UNKNOWN")
      })

      this.socket.on("disconnect", () => {
        this.connectionState$.next("DISCONNECTED")
        this.addEvent({
          type: "DISCONNECTED",
          time: Date.now(),
          manual: true,
        })
      })
    } catch (error) {
      this.handleError(error, "CONNECTION")
    }

    platform.analytics?.logEvent({
      type: "HOPP_REQUEST_RUN",
      platform: "socketio",
    })
  }

  private handleError(error: unknown, type: SIOErrorType) {
    this.disconnect()
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: {
        type,
        value: error,
      },
    })
  }

  sendMessage(event: { message: string; eventName: string }) {
    if (this.connectionState$.value === "DISCONNECTED") return
    const { message, eventName } = event

    // Parse JSON object/array strings into native values so socket.io
    // sends them as structured JSON rather than double-serialized strings.
    // Only attempt parsing for object/array shapes to avoid silently
    // coercing primitives like "null", "true", or "42".
    let payload: unknown = message
    const trimmed = message.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        payload = JSON.parse(message)
      } catch {
        // Not valid JSON, send as plain string
      }
    }

    this.socket?.emit(eventName, payload, (data) => {
      // receive response from server
      this.addEvent({
        time: Date.now(),
        type: "MESSAGE_RECEIVED",
        message: {
          eventName,
          value: data,
        },
      })
    })

    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_SENT",
      message: {
        eventName,
        value: payload,
      },
    })
  }

  disconnect() {
    this.socket?.close()
    this.connectionState$.next("DISCONNECTED")
  }
}
