import { BehaviorSubject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"
import { SIOClientV2, SIOClientV3, SIOClientV4, SIOClient } from "./SIOClients"
import { SIOClientVersion } from "~/newstore/SocketIOSession"

export const SocketClients = {
  v2: SIOClientV2,
  v3: SIOClientV3,
  v4: SIOClientV4,
}

type SIOAuth = { type: "None" | "Bearer"; token: string }

export type ConnectionOption = {
  url: string
  path: string
  clientVersion: SIOClientVersion
  auth: SIOAuth | undefined
}

export type SIOEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: string }
  | { type: "MESSAGE_RECEIVED"; message: string }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: string }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class SIOConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  events$: BehaviorSubject<SIOEvent[]>
  socket: SIOClient | undefined
  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
    this.events$ = new BehaviorSubject<SIOEvent[]>([])
  }

  private addEvent(event: SIOEvent) {
    this.events$.next([...this.events$.value, event])
  }

  connect({ url, path, clientVersion, auth }: ConnectionOption) {
    this.connectionState$.next("CONNECTING")
    this.addEvent({
      time: Date.now(),
      type: "CONNECTING",
    })
    try {
      this.socket = new SocketClients[clientVersion]()

      if (auth?.type === "Bearer") {
        this.socket.connect(url, {
          path,
          auth: {
            token: auth.token,
          },
        })
      } else {
        this.socket.connect(url)
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
          message: `[${eventName}] ${message ? JSON.stringify(message) : ""}`,
          type: "MESSAGE_RECEIVED",
          time: Date.now(),
        })
      })

      this.socket.on("connect_error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("reconnect_error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("disconnect", () => {
        this.connectionState$.next("DISCONNECTED")
        this.addEvent({
          type: "DISCONNECTED",
          time: Date.now(),
          manual: true,
        })
      })
    } catch (e) {
      this.handleError(e)
    }

    logHoppRequestRunToAnalytics({
      platform: "socketio",
    })
  }

  private handleError(error: any) {
    this.disconnect()
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error,
    })
  }

  sendMessage(event: { message: string; eventName: string }) {
    if (this.connectionState$.value === "DISCONNECTED") return
    const { message, eventName } = event

    this.socket?.emit(eventName, message, (data: object) => {
      // receive response from server
      this.addEvent({
        time: Date.now(),
        type: "MESSAGE_RECEIVED",
        message: `[${eventName}] ${JSON.stringify(data)}`,
      })
    })

    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_SENT",
      message: `[${eventName}] ${JSON.stringify(message)}`,
    })
  }

  disconnect() {
    this.socket?.close()
    this.connectionState$.next("DISCONNECTED")
  }
}
