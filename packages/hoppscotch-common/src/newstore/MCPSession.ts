import {
  HoppMCPRequest,
  MCPAuth,
  MCPEnvVar,
  MCPHTTPConfig,
  MCPMethodInvocation,
  MCPSTDIOConfig,
  MCPTransportType,
  getDefaultMCPRequest,
} from "@hoppscotch/data"
import { distinctUntilChanged, pluck } from "rxjs/operators"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"
import {
  MCPConnection,
  MCPCapabilities,
} from "~/helpers/realtime/MCPConnection"
import { MCPHTTPConnection } from "~/helpers/realtime/MCPHTTPConnection"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export type HoppMCPSession = {
  request: HoppMCPRequest
  connection: MCPConnection
  log: HoppRealtimeLog
  capabilities: MCPCapabilities | null
}

const defaultRequest = getDefaultMCPRequest()

const createDefaultConnection = () =>
  new MCPHTTPConnection(defaultRequest.httpConfig?.url ?? "", { type: "none" })

const defaultMCPSession: HoppMCPSession = {
  request: defaultRequest,
  connection: createDefaultConnection(),
  log: [],
  capabilities: null,
}

const getNextRequestForTransport = (
  request: HoppMCPRequest,
  transportType: MCPTransportType
): HoppMCPRequest => ({
  ...request,
  transportType,
  httpConfig:
    transportType === "http"
      ? (request.httpConfig ?? {
          url: "",
        })
      : request.httpConfig,
  stdioConfig:
    transportType === "stdio"
      ? (request.stdioConfig ?? {
          command: "",
          args: [],
          env: [],
        })
      : request.stdioConfig,
})

const getSTDIOConfig = (config: MCPSTDIOConfig | null): MCPSTDIOConfig =>
  config ?? {
    command: "",
    args: [],
    env: [],
  }

const dispatchers = defineDispatchers({
  setRequest(
    _: HoppMCPSession,
    { newRequest }: { newRequest: HoppMCPRequest }
  ) {
    return {
      request: newRequest,
    }
  },
  setTransportType(
    current: HoppMCPSession,
    { transportType }: { transportType: MCPTransportType }
  ) {
    return {
      request: getNextRequestForTransport(current.request, transportType),
    }
  },
  setHTTPConfig(
    current: HoppMCPSession,
    { config }: { config: MCPHTTPConfig | null }
  ) {
    return {
      request: {
        ...current.request,
        httpConfig: config,
      },
    }
  },
  setSTDIOConfig(
    current: HoppMCPSession,
    { config }: { config: MCPSTDIOConfig | null }
  ) {
    return {
      request: {
        ...current.request,
        stdioConfig: config,
      },
    }
  },
  setAuth(current: HoppMCPSession, { auth }: { auth: MCPAuth }) {
    return {
      request: {
        ...current.request,
        auth,
      },
    }
  },
  setMethod(
    current: HoppMCPSession,
    { method }: { method: MCPMethodInvocation }
  ) {
    return {
      request: {
        ...current.request,
        method,
      },
    }
  },
  addEnvVar(current: HoppMCPSession, { envVar }: { envVar: MCPEnvVar }) {
    const stdioConfig = getSTDIOConfig(current.request.stdioConfig)

    return {
      request: {
        ...current.request,
        stdioConfig: {
          ...stdioConfig,
          env: [...stdioConfig.env, envVar],
        },
      },
    }
  },
  updateEnvVar(
    current: HoppMCPSession,
    { index, envVar }: { index: number; envVar: MCPEnvVar }
  ) {
    const stdioConfig = getSTDIOConfig(current.request.stdioConfig)

    return {
      request: {
        ...current.request,
        stdioConfig: {
          ...stdioConfig,
          env: stdioConfig.env.map((item, itemIndex) =>
            itemIndex === index ? envVar : item
          ),
        },
      },
    }
  },
  removeEnvVar(current: HoppMCPSession, { index }: { index: number }) {
    const stdioConfig = getSTDIOConfig(current.request.stdioConfig)

    return {
      request: {
        ...current.request,
        stdioConfig: {
          ...stdioConfig,
          env: stdioConfig.env.filter((_, itemIndex) => itemIndex !== index),
        },
      },
    }
  },
  clearEnvVars(current: HoppMCPSession, {}) {
    const stdioConfig = getSTDIOConfig(current.request.stdioConfig)

    return {
      request: {
        ...current.request,
        stdioConfig: {
          ...stdioConfig,
          env: [],
        },
      },
    }
  },
  setConnection(
    _: HoppMCPSession,
    { connection }: { connection: MCPConnection }
  ) {
    return {
      connection,
    }
  },
  setLog(_: HoppMCPSession, { log }: { log: HoppRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(current: HoppMCPSession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...current.log, line],
    }
  },
  setCapabilities(
    _: HoppMCPSession,
    { capabilities }: { capabilities: MCPCapabilities | null }
  ) {
    return {
      capabilities,
    }
  },
})

const MCPSessionStore = new DispatchingStore(defaultMCPSession, dispatchers)

export function setMCPRequest(newRequest?: HoppMCPRequest) {
  MCPSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? getDefaultMCPRequest(),
    },
  })
}

export function setMCPTransportType(transportType: MCPTransportType) {
  MCPSessionStore.dispatch({
    dispatcher: "setTransportType",
    payload: {
      transportType,
    },
  })
}

export function setMCPHTTPConfig(config: MCPHTTPConfig | null) {
  MCPSessionStore.dispatch({
    dispatcher: "setHTTPConfig",
    payload: {
      config,
    },
  })
}

export function setMCPSTDIOConfig(config: MCPSTDIOConfig | null) {
  MCPSessionStore.dispatch({
    dispatcher: "setSTDIOConfig",
    payload: {
      config,
    },
  })
}

export function setMCPAuth(auth: MCPAuth) {
  MCPSessionStore.dispatch({
    dispatcher: "setAuth",
    payload: {
      auth,
    },
  })
}

export function setMCPMethod(method: MCPMethodInvocation) {
  MCPSessionStore.dispatch({
    dispatcher: "setMethod",
    payload: {
      method,
    },
  })
}

export function addMCPEnvVar(envVar: MCPEnvVar) {
  MCPSessionStore.dispatch({
    dispatcher: "addEnvVar",
    payload: {
      envVar,
    },
  })
}

export function updateMCPEnvVar(index: number, envVar: MCPEnvVar) {
  MCPSessionStore.dispatch({
    dispatcher: "updateEnvVar",
    payload: {
      index,
      envVar,
    },
  })
}

export function deleteMCPEnvVar(index: number) {
  MCPSessionStore.dispatch({
    dispatcher: "removeEnvVar",
    payload: {
      index,
    },
  })
}

export function deleteAllMCPEnvVars() {
  MCPSessionStore.dispatch({
    dispatcher: "clearEnvVars",
    payload: {},
  })
}

export function setMCPConnection(connection: MCPConnection) {
  MCPSessionStore.dispatch({
    dispatcher: "setConnection",
    payload: {
      connection,
    },
  })
}

export function setMCPLog(log: HoppRealtimeLog) {
  MCPSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addMCPLogLine(line: HoppRealtimeLogLine) {
  MCPSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export function setMCPCapabilities(capabilities: MCPCapabilities | null) {
  MCPSessionStore.dispatch({
    dispatcher: "setCapabilities",
    payload: {
      capabilities,
    },
  })
}

export const MCPRequest$ = MCPSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const MCPTransportType$ = MCPSessionStore.subject$.pipe(
  pluck("request", "transportType"),
  distinctUntilChanged()
)

export const MCPHTTPConfig$ = MCPSessionStore.subject$.pipe(
  pluck("request", "httpConfig"),
  distinctUntilChanged()
)

export const MCPSTDIOConfig$ = MCPSessionStore.subject$.pipe(
  pluck("request", "stdioConfig"),
  distinctUntilChanged()
)

export const MCPAuth$ = MCPSessionStore.subject$.pipe(
  pluck("request", "auth"),
  distinctUntilChanged()
)

export const MCPMethod$ = MCPSessionStore.subject$.pipe(
  pluck("request", "method"),
  distinctUntilChanged()
)

export const MCPConnection$ = MCPSessionStore.subject$.pipe(
  pluck("connection"),
  distinctUntilChanged()
)

export const MCPLog$ = MCPSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)

export const MCPCapabilities$ = MCPSessionStore.subject$.pipe(
  pluck("capabilities"),
  distinctUntilChanged()
)
