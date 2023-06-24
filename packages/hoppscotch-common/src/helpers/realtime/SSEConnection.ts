import { BehaviorSubject, Subject } from "rxjs"
import { platform } from "~/platform"

export type SSEEvent = { time: number } & (
  | { type: "STARTING" }
  | { type: "STARTED" }
  | { type: "MESSAGE_RECEIVED"; message: string }
  | { type: "STOPPED"; manual: boolean }
  | { type: "ERROR"; error: Event | null }
)

export type ConnectionState = "STARTING" | "STARTED" | "STOPPED"

export class SSEConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  event$: Subject<SSEEvent> = new Subject()
  sse: EventSource | undefined
  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("STOPPED")
  }

  private addEvent(event: SSEEvent) {
    this.event$.next(event)
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
        this.sse.onerror = (e) => {
          this.handleError(e)
          this.stop()
        }
        this.sse.addEventListener(eventType, ({ data }) => {
          this.addEvent({
            type: "MESSAGE_RECEIVED",
            message: data,
            time: Date.now(),
          })
        })
      } catch (error) {
        // A generic event type returned if anything goes wrong or browser doesn't support SSE
        // https://developer.mozilla.org/en-US/docs/Web/API/EventSource/error_event#event_type
        this.handleError(error as Event)
      }
    } else {
      this.addEvent({
        type: "ERROR",
        time: Date.now(),
        error: null,
      })
    }

    platform.analytics?.logEvent({
      type: "HOPP_REQUEST_RUN",
      platform: "sse",
    })
  }

  private handleError(error: Event) {
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
