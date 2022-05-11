import { BehaviorSubject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"

export type SSEEvent = { time: number } & (
  | { type: "STARTING" }
  | { type: "STARTED" }
  | { type: "MESSAGE_RECEIVED"; message: string }
  | { type: "STOPPED"; manual: boolean }
  | { type: "ERROR"; error: string }
)

export type ConnectionState = "STARTING" | "STARTED" | "STOPPED"

export class SSEConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  events$: BehaviorSubject<SSEEvent[]>
  sse: EventSource | undefined
  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("STOPPED")
    this.events$ = new BehaviorSubject<SSEEvent[]>([])
  }

  private addEvent(event: SSEEvent) {
    this.events$.next([...this.events$.value, event])
  }

  start(url: string, eventType: string) {
    this.connectionState$.next("STARTING")
    this.addEvent({
      time: Date.now(),
      type: "STARTING",
    })
    if (typeof EventSource !== "undefined") {
      try {
        this.sse = new EventSource(url)
        this.sse.onopen = () => {
          this.connectionState$.next("STARTED")
          this.addEvent({
            type: "STARTED",
            time: Date.now(),
          })
        }
        this.sse.onerror = this.handleError
        this.sse.addEventListener(eventType, ({ data }) => {
          this.addEvent({
            type: "MESSAGE_RECEIVED",
            message: data,
            time: Date.now(),
          })
        })
      } catch (e) {
        this.handleError(e)
        this.addEvent({
          type: "ERROR",
          time: Date.now(),
          error: "",
        })
      }
    } else {
      this.addEvent({
        type: "ERROR",
        time: Date.now(),
        error: "error.browser_support_sse",
      })
    }

    logHoppRequestRunToAnalytics({
      platform: "sse",
    })
  }

  private handleError(error: any) {
    this.stop()
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error,
    })
  }

  stop() {
    this.sse?.close()
    this.connectionState$.next("STOPPED")
    this.addEvent({
      type: "STOPPED",
      time: Date.now(),
      manual: true,
    })
  }
}
