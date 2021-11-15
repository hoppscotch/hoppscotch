import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type WSProtocol = {
  value: string
  active: boolean
}

type WSRequest = {
  endpoint: string
  protocols: WSProtocol[]
}

type WSSession = {
  request: WSRequest
  connectingState: boolean
  connectionState: boolean
  log
  socket
}

const defaultWSRequest: WSRequest = {
  endpoint: "wss://hoppscotch-websocket.herokuapp.com",
  protocols: [],
}

const defaultWSSession: WSSession = {
  request: defaultWSRequest,
  connectionState: false,
  connectingState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_, { newRequest }: { newRequest: WSRequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: WSSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        protocols: curr.request.protocols,
        endpoint: newEndpoint,
      },
    }
  },
  setProtocols(curr: WSSession, { protocols }: { protocols: WSProtcol[] }) {
    return {
      request: {
        protocols,
        endpoint: curr.request.endpoint,
      },
    }
  },
  addProtocol(curr: WSSession, { protocol }: { protocol: WSProtcol }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [...curr.request.protocols, protocol],
      },
    }
  },
  deleteProtocol(curr: WSSession, { index }: { index: number }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: curr.request.protocols.filter((_, idx) => index !== idx),
      },
    }
  },
  deleteAllProtocols(curr: WSSession) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [],
      },
    }
  },
  updateProtocol(
    curr: WSSession,
    { index, updatedProtocol }: { index: number; updatedProtocol: WSProtcol }
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
  addLogLine(curr: WSSession, { line }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const WSSessionStore = new DispatchingStore(defaultWSSession, dispatchers)

export function setWSRequest(newRequest?: WSRequest) {
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

export function setWSProtocols(protocols: WSProtocol[]) {
  WSSessionStore.dispatch({
    dispatcher: "setProtocols",
    payload: {
      protocols,
    },
  })
}

export function addWSProtocol(protocol: WSProtocol) {
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

export function updateWSProtocol(index: number, updatedProtocol: WSProtocol) {
  WSSessionStore.dispatch({
    dispatcher: "updateProtocol",
    payload: {
      index,
      updatedProtocol,
    },
  })
}

export function setWSSocket(socket) {
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

export function setWSLog(log) {
  WSSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addWSLogLine(line) {
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
