import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type SSERequest = {
  endpoint: string
  eventType: string
}

type SSESession = {
  request: SSERequest
  connectingState: boolean
  connectionState: boolean
  log: Array
  socket
}

const defaultSSERequest: SSERequest = {
  endpoint: "https://express-eventsource.herokuapp.com/events",
  eventType: "data",
}

const defaultSSESession: SSESession = {
  request: defaultSSERequest,
  connectionState: false,
  connectingState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_, { newRequest }: { newRequest: SSERequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: SSESession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        eventType: curr.request.eventType,
        endpoint: newEndpoint,
      },
    }
  },
  setEventType(curr: SSESession, { newType }: { newType: string }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        eventType: newType,
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
  setLog(_, { log }) {
    return {
      log,
    }
  },
  addLogLine(curr: SSESession, { line }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SSESessionStore = new DispatchingStore(defaultSSESession, dispatchers)

export function setSSERequest(newRequest?: SSERequest) {
  SSESessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultSSERequest,
    },
  })
}

export function setSSEEndpoint(newEndpoint: string) {
  SSESessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setSSEEventType(newType: string) {
  SSESessionStore.dispatch({
    dispatcher: "setEventType",
    payload: {
      newType,
    },
  })
}

export function setSSESocket(socket) {
  SSESessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setSSEConnectionState(state: boolean) {
  SSESessionStore.dispatch({
    dispatcher: "setConnectionState",
    payload: {
      state,
    },
  })
}
export function setSSEConnectingState(state: boolean) {
  SSESessionStore.dispatch({
    dispatcher: "setConnectingState",
    payload: {
      state,
    },
  })
}

export function setSSELog(log) {
  SSESessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSSELogLine(line) {
  SSESessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const SSERequest$ = SSESessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const SSEEndpoint$ = SSESessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const SSEEventType$ = SSESessionStore.subject$.pipe(
  pluck("request", "eventType"),
  distinctUntilChanged()
)

export const SSEConnectingState$ = SSESessionStore.subject$.pipe(
  pluck("connectingState"),
  distinctUntilChanged()
)

export const SSEConnectionState$ = SSESessionStore.subject$.pipe(
  pluck("connectionState"),
  distinctUntilChanged()
)

export const SSESocket$ = SSESessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const SSELog$ = SSESessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
