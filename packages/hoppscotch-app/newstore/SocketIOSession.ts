import { pluck, distinctUntilChanged } from "rxjs/operators"
import { Socket as SocketV2 } from "socket.io-client-v2"
import { Socket as SocketV3 } from "socket.io-client-v3"
import { Socket as SocketV4 } from "socket.io-client-v4"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"

type SocketIO = SocketV2 | SocketV3 | SocketV4

type HoppSIORequest = {
  endpoint: string
  path: string
  version: string
}

type HoppSIOSession = {
  request: HoppSIORequest
  connectingState: boolean
  connectionState: boolean
  log: HoppRealtimeLog
  socket: SocketIO | null
}

const defaultSIORequest: HoppSIORequest = {
  endpoint: "wss://hoppscotch-socketio.herokuapp.com",
  path: "/socket.io",
  version: "v4",
}

const defaultSIOSession: HoppSIOSession = {
  request: defaultSIORequest,
  connectionState: false,
  connectingState: false,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(
    _: HoppSIOSession,
    { newRequest }: { newRequest: HoppSIORequest }
  ) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: HoppSIOSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        ...curr.request,
        endpoint: newEndpoint,
      },
    }
  },
  setPath(curr: HoppSIOSession, { newPath }: { newPath: string }) {
    return {
      request: {
        ...curr.request,
        path: newPath,
      },
    }
  },
  setVersion(curr: HoppSIOSession, { newVersion }: { newVersion: string }) {
    return {
      request: {
        ...curr.request,
        version: newVersion,
      },
    }
  },
  setSocket(_: HoppSIOSession, { socket }: { socket: SocketIO }) {
    return {
      socket,
    }
  },
  setConnectionState(_: HoppSIOSession, { state }: { state: boolean }) {
    return {
      connectionState: state,
    }
  },
  setConnectingState(_: HoppSIOSession, { state }: { state: boolean }) {
    return {
      connectingState: state,
    }
  },
  setLog(_: HoppSIOSession, { log }: { log: HoppRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: HoppSIOSession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SIOSessionStore = new DispatchingStore(defaultSIOSession, dispatchers)

export function setSIORequest(newRequest?: HoppSIORequest) {
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

export function setSIOSocket(socket: SocketIO) {
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

export function setSIOLog(log: HoppRealtimeLog) {
  SIOSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSIOLogLine(line: HoppRealtimeLogLine) {
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
