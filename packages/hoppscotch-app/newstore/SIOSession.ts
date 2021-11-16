import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type SIORequest = {
  endpoint: string
  path: string
  version: string
}

type SIOSession = {
  request: SIORequest
  connectingState: boolean
  connectionState: boolean
  log: Array
  socket
}

const defaultSIORequest: SIORequest = {
  endpoint: "wss://hoppscotch-socketio.herokuapp.com",
  path: "/socket.io",
  version: "v4",
}

const defaultSIOSession: SIOSession = {
  request: defaultSIORequest,
  connectionState: false,
  connectingState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_, { newRequest }: { newRequest: SIORequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: SIOSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        ...curr.request,
        endpoint: newEndpoint,
      },
    }
  },
  setPath(curr: SIOSession, { newPath }: { newPath: string }) {
    return {
      request: {
        ...curr.request,
        path: newPath,
      },
    }
  },
  setVersion(curr: SIOSession, { newVersion }: { newVersion: string }) {
    return {
      request: {
        ...curr.request,
        version: newVersion,
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
  addLogLine(curr: SIOSession, { line }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SIOSessionStore = new DispatchingStore(defaultSIOSession, dispatchers)

export function setSIORequest(newRequest?: SIORequest) {
  SIOSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultSIORequest,
    },
  })
}

export function setSIOEndpoint(newEndpoint: string) {
  SIOSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setSIOVersion(newVersion: string) {
  SIOSessionStore.dispatch({
    dispatcher: "setVersion",
    payload: {
      newVersion,
    },
  })
}

export function setSIOPath(newPath: string) {
  SIOSessionStore.dispatch({
    dispatcher: "setPath",
    payload: {
      newPath,
    },
  })
}

export function setSIOSocket(socket) {
  SIOSessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setSIOConnectionState(state: boolean) {
  SIOSessionStore.dispatch({
    dispatcher: "setConnectionState",
    payload: {
      state,
    },
  })
}
export function setSIOConnectingState(state: boolean) {
  SIOSessionStore.dispatch({
    dispatcher: "setConnectingState",
    payload: {
      state,
    },
  })
}

export function setSIOLog(log) {
  SIOSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSIOLogLine(line) {
  SIOSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const SIORequest$ = SIOSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const SIOEndpoint$ = SIOSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const SIOVersion$ = SIOSessionStore.subject$.pipe(
  pluck("request", "version"),
  distinctUntilChanged()
)

export const SIOPath$ = SIOSessionStore.subject$.pipe(
  pluck("request", "path"),
  distinctUntilChanged()
)

export const SIOConnectingState$ = SIOSessionStore.subject$.pipe(
  pluck("connectingState"),
  distinctUntilChanged()
)

export const SIOConnectionState$ = SIOSessionStore.subject$.pipe(
  pluck("connectionState"),
  distinctUntilChanged()
)

export const SIOSocket$ = SIOSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const SIOLog$ = SIOSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
