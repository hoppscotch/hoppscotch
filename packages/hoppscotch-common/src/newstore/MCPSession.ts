import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  HoppRealtimeLog,
  HoppRealtimeLogLine,
} from "~/helpers/types/HoppRealtimeLog"
import {
  MCPConnection,
  MCPCapabilities,
} from "~/helpers/realtime/MCPConnection"
import { MCPHTTPConnection } from "~/helpers/realtime/MCPHTTPConnection"

export type MCPTransportType = "stdio" | "http"

export type MCPEnvVar = {
  key: string
  value: string
  active: boolean
}

export type MCPSTDIOConfig = {
  command: string
  args: string[]
  env: MCPEnvVar[]
}

export type MCPHTTPConfig = {
  url: string
}

export type MCPAuthType = "none" | "basic" | "bearer" | "api-key"

export type MCPAuth = {
  authType: MCPAuthType
  authActive: boolean
  // Basic auth
  username?: string
  password?: string
  // Bearer token
  token?: string
  // API Key
  key?: string
  value?: string
  addTo?: "HEADERS" | "QUERY_PARAMS"
}

export type MCPMethodType = "tool" | "prompt" | "resource"

export type MCPMethodInvocation = {
  methodType: MCPMethodType | null
  methodName: string
  arguments: string // JSON string
}

type HoppMCPRequest = {
  transportType: MCPTransportType
  stdioConfig: MCPSTDIOConfig | null
  httpConfig: MCPHTTPConfig | null
  auth: MCPAuth
  method: MCPMethodInvocation
}

export type HoppMCPSession = {
  request: HoppMCPRequest
  log: HoppRealtimeLog
  connection: MCPConnection
  capabilities: MCPCapabilities | null
}

const defaultMCPRequest: HoppMCPRequest = {
  transportType: "http",
  stdioConfig: null,
  httpConfig: {
    url: "",
  },
  auth: {
    authType: "none",
    authActive: false,
  },
  method: {
    methodType: null,
    methodName: "",
    arguments: "{}",
  },
}

const defaultMCPSession: HoppMCPSession = {
  request: defaultMCPRequest,
  connection: new MCPHTTPConnection("", { type: "none" }),
  log: [],
  capabilities: null,
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
    curr: HoppMCPSession,
    { transportType }: { transportType: MCPTransportType }
  ) {
    return {
      request: {
        ...curr.request,
        transportType,
      },
    }
  },
  setSTDIOConfig(
    curr: HoppMCPSession,
    { config }: { config: MCPSTDIOConfig | null }
  ) {
    return {
      request: {
        ...curr.request,
        stdioConfig: config,
      },
    }
  },
  setHTTPConfig(
    curr: HoppMCPSession,
    { config }: { config: MCPHTTPConfig | null }
  ) {
    return {
      request: {
        ...curr.request,
        httpConfig: config,
      },
    }
  },
  setAuth(curr: HoppMCPSession, { auth }: { auth: MCPAuth }) {
    return {
      request: {
        ...curr.request,
        auth,
      },
    }
  },
  setMethod(curr: HoppMCPSession, { method }: { method: MCPMethodInvocation }) {
    return {
      request: {
        ...curr.request,
        method,
      },
    }
  },
  addEnvVar(curr: HoppMCPSession, { envVar }: { envVar: MCPEnvVar }) {
    if (!curr.request.stdioConfig) return {}

    return {
      request: {
        ...curr.request,
        stdioConfig: {
          ...curr.request.stdioConfig,
          env: [...curr.request.stdioConfig.env, envVar],
        },
      },
    }
  },
  deleteEnvVar(curr: HoppMCPSession, { index }: { index: number }) {
    if (!curr.request.stdioConfig) return {}

    return {
      request: {
        ...curr.request,
        stdioConfig: {
          ...curr.request.stdioConfig,
          env: curr.request.stdioConfig.env.filter((_, idx) => index !== idx),
        },
      },
    }
  },
  deleteAllEnvVars(curr: HoppMCPSession, {}) {
    if (!curr.request.stdioConfig) return {}

    return {
      request: {
        ...curr.request,
        stdioConfig: {
          ...curr.request.stdioConfig,
          env: [],
        },
      },
    }
  },
  updateEnvVar(
    curr: HoppMCPSession,
    { index, updatedEnvVar }: { index: number; updatedEnvVar: MCPEnvVar }
  ) {
    if (!curr.request.stdioConfig) return {}

    return {
      request: {
        ...curr.request,
        stdioConfig: {
          ...curr.request.stdioConfig,
          env: curr.request.stdioConfig.env.map((envVar, idx) => {
            return index === idx ? updatedEnvVar : envVar
          }),
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
  addLogLine(curr: HoppMCPSession, { line }: { line: HoppRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
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
      newRequest: newRequest ?? defaultMCPRequest,
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

export function setMCPSTDIOConfig(config: MCPSTDIOConfig | null) {
  MCPSessionStore.dispatch({
    dispatcher: "setSTDIOConfig",
    payload: {
      config,
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

export function deleteMCPEnvVar(index: number) {
  MCPSessionStore.dispatch({
    dispatcher: "deleteEnvVar",
    payload: {
      index,
    },
  })
}

export function deleteAllMCPEnvVars() {
  MCPSessionStore.dispatch({
    dispatcher: "deleteAllEnvVars",
    payload: {},
  })
}

export function updateMCPEnvVar(index: number, updatedEnvVar: MCPEnvVar) {
  MCPSessionStore.dispatch({
    dispatcher: "updateEnvVar",
    payload: {
      index,
      updatedEnvVar,
    },
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

export const MCPSTDIOConfig$ = MCPSessionStore.subject$.pipe(
  pluck("request", "stdioConfig"),
  distinctUntilChanged()
)

export const MCPHTTPConfig$ = MCPSessionStore.subject$.pipe(
  pluck("request", "httpConfig"),
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
