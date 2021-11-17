import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type MQTTRequest = {
  endpoint: string
}

type MQTTSession = {
  request: MQTTRequest
  connectingState: boolean
  connectionState: boolean
  subscriptionState: boolean
  log: Array
  socket
}

const defaultMQTTRequest: MQTTRequest = {
  endpoint: "wss://test.mosquitto.org:8081",
}

const defaultMQTTSession: MQTTSession = {
  request: defaultMQTTRequest,
  connectionState: false,
  connectingState: false,
  subscriptionState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_, { newRequest }: { newRequest: MQTTRequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(_, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        endpoint: newEndpoint,
      },
    }
  },
  setSocket(_, { socket }) {
    return {
      socket,
    }
  },
  setConnectionState(_, { state }: { state: boolean }) {
    return {
      connectionState: state,
    }
  },
  setConnectingState(_, { state }: { state: boolean }) {
    return {
      connectingState: state,
    }
  },
  setSubscriptionState(_, { state }: { state: boolean }) {
    return {
      subscriptionState: state,
    }
  },
  setLog(_, { log }) {
    return {
      log,
    }
  },
  addLogLine(curr: MQTTSession, { line }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const MQTTSessionStore = new DispatchingStore(defaultMQTTSession, dispatchers)

export function setMQTTRequest(newRequest?: MQTTRequest) {
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

export function setMQTTSocket(socket) {
  MQTTSessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setMQTTConnectionState(state: boolean) {
  MQTTSessionStore.dispatch({
    dispatcher: "setConnectionState",
    payload: {
      state,
    },
  })
}

export function setMQTTConnectingState(state: boolean) {
  MQTTSessionStore.dispatch({
    dispatcher: "setConnectingState",
    payload: {
      state,
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

export function setMQTTLog(log) {
  MQTTSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addMQTTLogLine(line) {
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

export const MQTTSocket$ = MQTTSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const MQTTLog$ = MQTTSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
