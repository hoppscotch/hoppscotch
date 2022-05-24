import Paho, { ConnectionOptions } from "paho-mqtt"
import { BehaviorSubject, Subject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"

export type MQTTMessage = { topic: string; message: string }
export type MQTTError =
  | { type: "CONNECTION_NOT_ESTABLISHED"; value: unknown }
  | { type: "CONNECTION_LOST" }
  | { type: "CONNECTION_FAILED" }
  | { type: "SUBSCRIPTION_FAILED"; topic: string }
  | { type: "PUBLISH_ERROR"; topic: string; message: string }

export type MQTTEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: MQTTMessage }
  | { type: "SUBSCRIBED"; topic: string }
  | { type: "SUBSCRIPTION_FAILED"; topic: string }
  | { type: "MESSAGE_RECEIVED"; message: MQTTMessage }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: MQTTError }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class MQTTConnection {
  private mqttclient: Paho.Client | undefined
  subscriptionState$ = new BehaviorSubject<boolean>(false)
  connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
  event$: Subject<MQTTEvent> = new Subject()
  private manualDisconnect = false

  private addEvent(event: MQTTEvent) {
    this.event$.next(event)
  }

  connect(url: string, username: string, password: string) {
    try {
      this.connectionState$.next("CONNECTING")

      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      const parseUrl = new URL(url)
      const { hostname, pathname, port } = parseUrl
      this.mqttclient = new Paho.Client(
        `${hostname + (pathname !== "/" ? pathname : "")}`,
        port !== "" ? Number(port) : 8081,
        "hoppscotch"
      )
      const connectOptions: ConnectionOptions = {
        onSuccess: this.onConnectionSuccess.bind(this),
        onFailure: this.onConnectionFailure.bind(this),
        useSSL: parseUrl.protocol !== "ws:",
      }
      if (username !== "") {
        connectOptions.userName = username
      }
      if (password !== "") {
        connectOptions.password = password
      }
      this.mqttclient.connect(connectOptions)
      this.mqttclient.onConnectionLost = this.onConnectionLost.bind(this)
      this.mqttclient.onMessageArrived = this.onMessageArrived.bind(this)
    } catch (e) {
      this.handleError(e)
    }

    logHoppRequestRunToAnalytics({
      platform: "mqtt",
    })
  }

  onConnectionFailure() {
    this.connectionState$.next("DISCONNECTED")
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: {
        type: "CONNECTION_FAILED",
      },
    })
  }

  onConnectionSuccess() {
    this.connectionState$.next("CONNECTED")
    this.addEvent({
      type: "CONNECTED",
      time: Date.now(),
    })
  }

  onConnectionLost() {
    this.connectionState$.next("DISCONNECTED")
    if (this.manualDisconnect) {
      this.addEvent({
        time: Date.now(),
        type: "DISCONNECTED",
        manual: this.manualDisconnect,
      })
    } else {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: {
          type: "CONNECTION_LOST",
        },
      })
    }
    this.manualDisconnect = false
    this.subscriptionState$.next(false)
  }

  onMessageArrived(data: { payloadString: string; destinationName: string }) {
    const { payloadString: message, destinationName: topic } = data
    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_RECEIVED",
      message: {
        topic,
        message,
      },
    })
  }

  private handleError(error: unknown) {
    this.disconnect()
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: {
        type: "CONNECTION_NOT_ESTABLISHED",
        value: error,
      },
    })
  }

  publish(topic: string, message: string) {
    if (this.connectionState$.value === "DISCONNECTED") return

    try {
      // it was publish
      this.mqttclient?.send(topic, message, 0, false)
      this.addEvent({
        time: Date.now(),
        type: "MESSAGE_SENT",
        message: {
          topic,
          message,
        },
      })
    } catch (e) {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: {
          type: "PUBLISH_ERROR",
          topic,
          message,
        },
      })
    }
  }

  subscribe(topic: string) {
    try {
      this.mqttclient?.subscribe(topic, {
        onSuccess: this.usubSuccess.bind(this, topic),
        onFailure: this.usubFailure.bind(this, topic),
      })
    } catch (e) {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: {
          type: "SUBSCRIPTION_FAILED",
          topic,
        },
      })
    }
  }

  usubSuccess(topic: string) {
    this.subscriptionState$.next(!this.subscriptionState$.value)
    this.addEvent({
      time: Date.now(),
      type: "SUBSCRIBED",
      topic,
    })
  }

  usubFailure(topic: string) {
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: {
        type: "SUBSCRIPTION_FAILED",
        topic,
      },
    })
  }

  unsubscribe(topic: string) {
    this.mqttclient?.unsubscribe(topic, {
      onSuccess: this.usubSuccess.bind(this, topic),
      onFailure: this.usubFailure.bind(this, topic),
    })
  }

  disconnect() {
    this.manualDisconnect = true
    this.mqttclient?.disconnect()
    this.connectionState$.next("DISCONNECTED")
  }
}
