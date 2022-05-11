import { BehaviorSubject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"

export type WSEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: string }
  | { type: "MESSAGE_RECEIVED"; message: string }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: string }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class WSConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  events$: BehaviorSubject<WSEvent[]>
  socket: WebSocket | undefined
  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
    this.events$ = new BehaviorSubject<WSEvent[]>([])
  }

  private addEvent(event: WSEvent) {
    this.events$.next([...this.events$.value, event])
  }

  connect(url: string, protocols: string[]) {
    try {
      this.connectionState$.next("CONNECTING")
      this.socket = new WebSocket(url, protocols)

      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      this.socket.onopen = () => {
        this.connectionState$.next("CONNECTED")
        this.addEvent({
          type: "CONNECTED",
          time: Date.now(),
        })
      }

      this.socket.onerror = (error) => {
        this.handleError(error)
      }

      this.socket.onclose = () => {
        this.connectionState$.next("DISCONNECTED")
        this.addEvent({
          type: "DISCONNECTED",
          time: Date.now(),
          manual: true,
        })
      }

      this.socket.onmessage = ({ data }) => {
        this.addEvent({
          time: Date.now(),
          type: "MESSAGE_RECEIVED",
          message: data,
        })
      }
    } catch (e) {
      this.handleError(e)
    }

    logHoppRequestRunToAnalytics({
      platform: "wss",
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
    const { message } = event
    this.socket?.send(message)
    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_SENT",
      message,
    })
  }

  disconnect() {
    this.socket?.close()
  }
}
