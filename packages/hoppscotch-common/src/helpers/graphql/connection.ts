import { GQLHeader, HoppGQLAuth, makeGQLRequest } from "@hoppscotch/data"
import { OperationType } from "@urql/core"
import * as E from "fp-ts/Either"
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
} from "graphql"
import { computed, reactive, ref } from "vue"
import { getService } from "~/modules/dioc"

import { addGraphqlHistoryEntry, makeGQLHistoryEntry } from "~/newstore/history"

import { InterceptorService } from "~/services/interceptor.service"
import { GQLTabService } from "~/services/tab/graphql"

const GQL_SCHEMA_POLL_INTERVAL = 7000

type RunQueryOptions = {
  name?: string
  url: string
  headers: GQLHeader[]
  query: string
  variables: string
  auth: HoppGQLAuth
  operationName: string | undefined
  operationType: OperationType
}

export type GQLResponseEvent = {
  time: number
  operationName: string | undefined
  operationType: OperationType
  data: string
  rawQuery?: RunQueryOptions
}

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"
export type SubscriptionState = "SUBSCRIBING" | "SUBSCRIBED" | "UNSUBSCRIBED"

const GQL = {
  CONNECTION_INIT: "connection_init",
  CONNECTION_ACK: "connection_ack",
  CONNECTION_ERROR: "connection_error",
  CONNECTION_KEEP_ALIVE: "ka",
  START: "start",
  STOP: "stop",
  CONNECTION_TERMINATE: "connection_terminate",
  DATA: "data",
  ERROR: "error",
  COMPLETE: "complete",
}

type Connection = {
  state: ConnectionState
  subscriptionState: Map<string, SubscriptionState>
  socket: WebSocket | undefined
  schema: GraphQLSchema | null
}

const tabs = getService(GQLTabService)
const currentTabID = computed(() => tabs.currentTabID.value)

export const connection = reactive<Connection>({
  state: "DISCONNECTED",
  subscriptionState: new Map<string, SubscriptionState>(),
  socket: undefined,
  schema: null,
})

export const schema = computed(() => connection.schema)
export const subscriptionState = computed(() => {
  return connection.subscriptionState.get(currentTabID.value)
})

export const gqlMessageEvent = ref<GQLResponseEvent | "reset">()

export const schemaString = computed(() => {
  if (!connection.schema) return ""

  return printSchema(connection.schema, {
    commentDescriptions: true,
  })
})

export const queryFields = computed(() => {
  if (!connection.schema) return []

  const fields = connection.schema.getQueryType()?.getFields()
  if (!fields) return []

  return Object.values(fields)
})

export const mutationFields = computed(() => {
  if (!connection.schema) return []

  const fields = connection.schema.getMutationType()?.getFields()
  if (!fields) return []

  return Object.values(fields)
})

export const subscriptionFields = computed(() => {
  if (!connection.schema) return []

  const fields = connection.schema.getSubscriptionType()?.getFields()
  if (!fields) return []

  return Object.values(fields)
})

export const graphqlTypes = computed(() => {
  if (!connection.schema) return []

  const typeMap = connection.schema.getTypeMap()

  const queryTypeName = connection.schema.getQueryType()?.name ?? ""
  const mutationTypeName = connection.schema.getMutationType()?.name ?? ""
  const subscriptionTypeName =
    connection.schema.getSubscriptionType()?.name ?? ""

  return Object.values(typeMap).filter((type) => {
    return (
      !type.name.startsWith("__") &&
      ![queryTypeName, mutationTypeName, subscriptionTypeName].includes(
        type.name
      ) &&
      (type instanceof GraphQLObjectType ||
        type instanceof GraphQLInputObjectType ||
        type instanceof GraphQLEnumType ||
        type instanceof GraphQLInterfaceType)
    )
  })
})

let timeoutSubscription: any

export const connect = (url: string, headers: GQLHeader[]) => {
  if (connection.state === "CONNECTED") {
    throw new Error(
      "A connection is already running. Close it before starting another."
    )
  }

  // Polling
  connection.state = "CONNECTED"

  const poll = async () => {
    await getSchema(url, headers)
    timeoutSubscription = setTimeout(() => {
      poll()
    }, GQL_SCHEMA_POLL_INTERVAL)
  }
  poll()
}

export const disconnect = () => {
  if (connection.state !== "CONNECTED") {
    throw new Error("No connections are running to be disconnected")
  }

  clearTimeout(timeoutSubscription)
  connection.state = "DISCONNECTED"
}

export const reset = () => {
  if (connection.state === "CONNECTED") disconnect()

  connection.state = "DISCONNECTED"
  connection.schema = null
}

const getSchema = async (url: string, headers: GQLHeader[]) => {
  try {
    const introspectionQuery = JSON.stringify({
      query: getIntrospectionQuery(),
    })

    const finalHeaders: Record<string, string> = {}
    headers
      .filter((x) => x.active && x.key !== "")
      .forEach((x) => (finalHeaders[x.key] = x.value))

    const reqOptions = {
      method: "POST",
      url,
      headers: {
        ...finalHeaders,
        "content-type": "application/json",
      },
      data: introspectionQuery,
    }

    const interceptorService = getService(InterceptorService)

    const res = await interceptorService.runRequest(reqOptions).response

    if (E.isLeft(res)) {
      console.error(res.left)
      throw new Error(res.left.toString())
    }

    const data = res.right

    // HACK : Temporary trailing null character issue from the extension fix
    const response = new TextDecoder("utf-8")
      .decode(data.data as any)
      .replace(/\0+$/, "")

    const introspectResponse = JSON.parse(response)

    const schema = buildClientSchema(introspectResponse.data)

    connection.schema = schema
  } catch (e: any) {
    console.error(e)
    disconnect()
  }
}

export const runGQLOperation = async (options: RunQueryOptions) => {
  const { url, headers, query, variables, auth, operationName, operationType } =
    options

  const finalHeaders: Record<string, string> = {}

  const parsedVariables = JSON.parse(variables || "{}")

  const params: Record<string, string> = {}

  if (auth.authActive) {
    if (auth.authType === "basic") {
      const username = auth.username
      const password = auth.password
      finalHeaders.Authorization = `Basic ${btoa(`${username}:${password}`)}`
    } else if (auth.authType === "bearer" || auth.authType === "oauth-2") {
      finalHeaders.Authorization = `Bearer ${auth.token}`
    } else if (auth.authType === "api-key") {
      const { key, value, addTo } = auth
      if (addTo === "Headers") {
        finalHeaders[key] = value
      } else if (addTo === "Query params") {
        params[key] = value
      }
    }
  }

  headers
    .filter((item) => item.active && item.key !== "")
    .forEach(({ key, value }) => (finalHeaders[key] = value))

  const reqOptions = {
    method: "POST",
    url,
    headers: {
      ...finalHeaders,
      "content-type": "application/json",
    },
    data: JSON.stringify({
      query,
      variables: parsedVariables,
      operationName,
    }),
    params: {
      ...params,
    },
  }

  if (operationType === "subscription") {
    return runSubscription(options, finalHeaders)
  }

  const interceptorService = getService(InterceptorService)
  const result = await interceptorService.runRequest(reqOptions).response

  if (E.isLeft(result)) {
    console.error(result.left)
    throw new Error(result.left.toString())
  }

  const res = result.right

  // HACK: Temporary trailing null character issue from the extension fix
  const responseText = new TextDecoder("utf-8")
    .decode(res.data as any)
    .replace(/\0+$/, "")

  gqlMessageEvent.value = {
    time: Date.now(),
    operationName: operationName ?? "query",
    data: responseText,
    rawQuery: options,
    operationType,
  }

  addQueryToHistory(options, responseText)

  return responseText
}

export const runSubscription = (
  options: RunQueryOptions,
  headers?: Record<string, string>
) => {
  const { url, query, operationName } = options
  const wsUrl = url.replace(/^http/, "ws")

  connection.subscriptionState.set(currentTabID.value, "SUBSCRIBING")

  connection.socket = new WebSocket(wsUrl, "graphql-ws")

  connection.socket.onopen = (event) => {
    console.log("WebSocket is open now.", event)

    connection.socket?.send(
      JSON.stringify({
        type: GQL.CONNECTION_INIT,
        payload: headers ?? {},
      })
    )

    connection.socket?.send(
      JSON.stringify({
        type: GQL.START,
        id: "1",
        payload: { query, operationName },
      })
    )
  }

  gqlMessageEvent.value = "reset"

  connection.socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case GQL.CONNECTION_ACK: {
        connection.subscriptionState.set(currentTabID.value, "SUBSCRIBED")
        break
      }
      case GQL.CONNECTION_ERROR: {
        console.error(data.payload)
        break
      }
      case GQL.CONNECTION_KEEP_ALIVE: {
        break
      }
      case GQL.DATA: {
        gqlMessageEvent.value = {
          time: Date.now(),
          operationName,
          data: JSON.stringify(data.payload),
          operationType: "subscription",
        }
        break
      }
      case GQL.COMPLETE: {
        console.log("completed", data.id)
        break
      }
    }
  }

  connection.socket.onclose = (event) => {
    console.log("WebSocket is closed now.", event)
    connection.subscriptionState.set(currentTabID.value, "UNSUBSCRIBED")
  }

  addQueryToHistory(options, "")

  return connection.socket
}

export const socketDisconnect = () => {
  connection.socket?.close()
}

const addQueryToHistory = (options: RunQueryOptions, response: string) => {
  const { name, url, headers, query, variables, auth } = options
  addGraphqlHistoryEntry(
    makeGQLHistoryEntry({
      request: makeGQLRequest({
        name: name ?? "Untitled Request",
        url,
        query,
        headers,
        variables,
        auth,
      }),
      response,
      star: false,
    })
  )
}
