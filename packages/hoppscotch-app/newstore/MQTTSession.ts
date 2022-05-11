import { distinctUntilChanged, pluck } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { MQTTConnection } from "~/helpers/realtime/MQTTConnection"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"

type HoppMQTTRequest = {
  endpoint: string
}

type HoppMQTTSession = {
  request: HoppMQTTRequest
  subscriptionState: boolean
  log: HoppRealtimeLog
  socket: MQTTConnection
}

const defaultMQTTRequest: HoppMQTTRequest = {
  endpoint: "wss://test.mosquitto.org:8081",
}

const defaultMQTTSession: HoppMQTTSession = {
  request: defaultMQTTRequest,
  subscriptionState: false,
  socket: new MQTTConnection(),
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(
    _: HoppMQTTSession,
    { newRequest }: { newRequest: HoppMQTTRequest }
  ) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(_: HoppMQTTSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        endpoint: newEndpoint,
      },
    }
  },
  setConn(_: HoppMQTTSession, { socket }: { socket: MQTTConnection }) {
    return {
      socket,
    }
  },
  setSubscriptionState(_: HoppMQTTSession, { state }: { state: boolean }) {
    return {
      subscriptionState: state,
    }
  },
  setLog(_: HoppMQTTSession, { log }: { log: HoppRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: HoppMQTTSession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const MQTTSessionStore = new DispatchingStore(defaultMQTTSession, dispatchers)

export function setMQTTRequest(newRequest?: HoppMQTTRequest) {
  MQTTSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultMQTTRequest,
    },
  })
}

export function setMQTTEndpoint(newEndpoint: string) {
  MQTTSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setMQTTConn(socket: MQTTConnection) {
  MQTTSessionStore.dispatch({
    dispatcher: "setConn",
    payload: {
      socket,
    },
  })
}

export function setMQTTSubscriptionState(state: boolean) {
  MQTTSessionStore.dispatch({
    dispatcher: "setSubscriptionState",
    payload: {
      state,
    },
  })
}

export function setMQTTLog(log: HoppRealtimeLog) {
  MQTTSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addMQTTLogLine(line: HoppRealtimeLogLine) {
  MQTTSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const MQTTRequest$ = MQTTSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const MQTTEndpoint$ = MQTTSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const MQTTConnectingState$ = MQTTSessionStore.subject$.pipe(
  pluck("connectingState"),
  distinctUntilChanged()
)

export const MQTTConnectionState$ = MQTTSessionStore.subject$.pipe(
  pluck("connectionState"),
  distinctUntilChanged()
)

export const MQTTSubscriptionState$ = MQTTSessionStore.subject$.pipe(
  pluck("subscriptionState"),
  distinctUntilChanged()
)

export const MQTTConn$ = MQTTSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const MQTTLog$ = MQTTSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
