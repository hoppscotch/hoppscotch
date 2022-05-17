import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"

type HoppWSProtocol = {
  value: string
  active: boolean
}

type HoppWSRequest = {
  endpoint: string
  protocols: HoppWSProtocol[]
}

export type HoppWSSession = {
  request: HoppWSRequest
  connectingState: boolean
  connectionState: boolean
  log: HoppRealtimeLog
  socket: WebSocket | null
}

const defaultWSRequest: HoppWSRequest = {
  endpoint: "wss://echo-websocket.hoppscotch.io",
  protocols: [],
}

const defaultWSSession: HoppWSSession = {
  request: defaultWSRequest,
  connectionState: false,
  connectingState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_: HoppWSSession, { newRequest }: { newRequest: HoppWSRequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: HoppWSSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        protocols: curr.request.protocols,
        endpoint: newEndpoint,
      },
    }
  },
  setProtocols(
    curr: HoppWSSession,
    { protocols }: { protocols: HoppWSProtocol[] }
  ) {
    return {
      request: {
        protocols,
        endpoint: curr.request.endpoint,
      },
    }
  },
  addProtocol(curr: HoppWSSession, { protocol }: { protocol: HoppWSProtocol }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [...curr.request.protocols, protocol],
      },
    }
  },
  deleteProtocol(curr: HoppWSSession, { index }: { index: number }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: curr.request.protocols.filter((_, idx) => index !== idx),
      },
    }
  },
  deleteAllProtocols(curr: HoppWSSession) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [],
      },
    }
  },
  updateProtocol(
    curr: HoppWSSession,
    {
      index,
      updatedProtocol,
    }: { index: number; updatedProtocol: HoppWSProtocol }
  ) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: curr.request.protocols.map((proto, idx) => {
          return index === idx ? updatedProtocol : proto
        }),
      },
    }
  },
  setSocket(_: HoppWSSession, { socket }: { socket: WebSocket }) {
    return {
      socket,
    }
  },
  setConnectionState(_: HoppWSSession, { state }: { state: boolean }) {
    return {
      connectionState: state,
    }
  },
  setConnectingState(_: HoppWSSession, { state }: { state: boolean }) {
    return {
      connectingState: state,
    }
  },
  setLog(_: HoppWSSession, { log }: { log: HoppRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: HoppWSSession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const WSSessionStore = new DispatchingStore(defaultWSSession, dispatchers)

export function setWSRequest(newRequest?: HoppWSRequest) {
  WSSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultWSRequest,
    },
  })
}

export function setWSEndpoint(newEndpoint: string) {
  WSSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setWSProtocols(protocols: HoppWSProtocol[]) {
  WSSessionStore.dispatch({
    dispatcher: "setProtocols",
    payload: {
      protocols,
    },
  })
}

export function addWSProtocol(protocol: HoppWSProtocol) {
  WSSessionStore.dispatch({
    dispatcher: "addProtocol",
    payload: {
      protocol,
    },
  })
}

export function deleteWSProtocol(index: number) {
  WSSessionStore.dispatch({
    dispatcher: "deleteProtocol",
    payload: {
      index,
    },
  })
}

export function deleteAllWSProtocols() {
  WSSessionStore.dispatch({
    dispatcher: "deleteAllProtocols",
    payload: {},
  })
}

export function updateWSProtocol(
  index: number,
  updatedProtocol: HoppWSProtocol
) {
  WSSessionStore.dispatch({
    dispatcher: "updateProtocol",
    payload: {
      index,
      updatedProtocol,
    },
  })
}

export function setWSSocket(socket: WebSocket) {
  WSSessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setWSConnectionState(state: boolean) {
  WSSessionStore.dispatch({
    dispatcher: "setConnectionState",
    payload: {
      state,
    },
  })
}
export function setWSConnectingState(state: boolean) {
  WSSessionStore.dispatch({
    dispatcher: "setConnectingState",
    payload: {
      state,
    },
  })
}

export function setWSLog(log: HoppRealtimeLog) {
  WSSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addWSLogLine(line: HoppRealtimeLogLine) {
  WSSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const WSRequest$ = WSSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const WSEndpoint$ = WSSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const WSProtocols$ = WSSessionStore.subject$.pipe(
  pluck("request", "protocols"),
  distinctUntilChanged()
)

export const WSConnectingState$ = WSSessionStore.subject$.pipe(
  pluck("connectingState"),
  distinctUntilChanged()
)

export const WSConnectionState$ = WSSessionStore.subject$.pipe(
  pluck("connectionState"),
  distinctUntilChanged()
)

export const WSSocket$ = WSSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const WSLog$ = WSSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
