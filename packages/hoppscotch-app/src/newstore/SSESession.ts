import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"
import { SSEConnection } from "~/helpers/realtime/SSEConnection"

type HoppSSERequest = {
  endpoint: string
  eventType: string
}

type HoppSSESession = {
  request: HoppSSERequest
  log: HoppRealtimeLog
  socket: SSEConnection
}

const defaultSSERequest: HoppSSERequest = {
  endpoint: "https://express-eventsource.herokuapp.com/events",
  eventType: "data",
}

const defaultSSESession: HoppSSESession = {
  request: defaultSSERequest,
  socket: new SSEConnection(),
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(
    _: HoppSSESession,
    { newRequest }: { newRequest: HoppSSERequest }
  ) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: HoppSSESession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        eventType: curr.request.eventType,
        endpoint: newEndpoint,
      },
    }
  },
  setEventType(curr: HoppSSESession, { newType }: { newType: string }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        eventType: newType,
      },
    }
  },
  setSocket(_: HoppSSESession, { socket }: { socket: SSEConnection }) {
    return {
      socket,
    }
  },
  setLog(_: HoppSSESession, { log }: { log: HoppRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: HoppSSESession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SSESessionStore = new DispatchingStore(defaultSSESession, dispatchers)

export function setSSERequest(newRequest?: HoppSSERequest) {
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

export function setSSESocket(socket: SSEConnection) {
  SSESessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setSSELog(log: HoppRealtimeLog) {
  SSESessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSSELogLine(line: HoppRealtimeLogLine) {
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

export const SSESocket$ = SSESessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const SSELog$ = SSESessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
