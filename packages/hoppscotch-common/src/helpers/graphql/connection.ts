import {
  HoppGQLAuth,
  HoppGQLRequest,
  HoppRESTHeaders,
  makeGQLRequest,
} from "@hoppscotch/data"
import { OperationType } from "@urql/core"
import { AwsV4Signer } from "aws4fetch"
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
import { clone } from "lodash-es"
import { Component, computed, reactive, ref } from "vue"
import { useToast } from "~/composables/toast"
import { getService } from "~/modules/dioc"
import { getI18n } from "~/modules/i18n"

import { addGraphqlHistoryEntry, makeGQLHistoryEntry } from "~/newstore/history"

import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { GQLTabService } from "~/services/tab/graphql"

import { MediaType, content, Method, RelayRequest } from "@hoppscotch/kernel"
import { GQLRequest } from "~/helpers/kernel/gql/request"
import { GQLResponse } from "~/helpers/kernel/gql/response"

const GQL_SCHEMA_POLL_INTERVAL = 7000

type ConnectionRequestOptions = {
  url: string
  request: HoppGQLRequest
  inheritedHeaders: HoppGQLRequest["headers"]
  inheritedAuth?: HoppGQLAuth
}

type RunQueryOptions = {
  name?: string
  url: string
  request: HoppGQLRequest
  inheritedHeaders: HoppGQLRequest["headers"]
  inheritedAuth?: HoppGQLAuth
  query: string
  variables: string
  operationName: string | undefined
  operationType: OperationType
}

export type GQLResponseEvent =
  | {
      type: "response"
      time: number
      operationName: string | undefined
      operationType: OperationType
      data: string
      rawQuery?: RunQueryOptions
      document?: {
        type: string
        statusCode: number
        statusText: string
        meta: {
          responseSize: number
          responseDuration: number
        }
      }
    }
  | {
      type: "error"
      error: {
        type: string
        message: string
        component?: Component
      }
    }

export type ConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"
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
  error?: {
    type: string
    message: (t: ReturnType<typeof getI18n>) => string
    component?: Component
  } | null
}

const tabs = getService(GQLTabService)
const currentTabID = computed(() => tabs.currentTabID.value)

export const connection = reactive<Connection>({
  state: "DISCONNECTED",
  subscriptionState: new Map<string, SubscriptionState>(),
  socket: undefined,
  schema: null,
  error: null,
})

export const schema = computed(() => connection.schema)
export const subscriptionState = computed(() =>
  connection.subscriptionState.get(currentTabID.value)
)

export const gqlMessageEvent = ref<GQLResponseEvent | "reset">()

export const schemaString = computed(() => {
  if (!connection.schema || !(connection.schema instanceof GraphQLSchema))
    return ""
  return printSchema(connection.schema)
})

export const queryFields = computed(() => {
  if (!connection.schema || !(connection.schema instanceof GraphQLSchema))
    return []
  const fields = connection.schema.getQueryType()?.getFields()
  return fields ? Object.values(fields) : []
})

export const mutationFields = computed(() => {
  if (!connection.schema || !(connection.schema instanceof GraphQLSchema))
    return []
  const fields = connection.schema.getMutationType()?.getFields()
  return fields ? Object.values(fields) : []
})

export const subscriptionFields = computed(() => {
  if (!connection.schema || !(connection.schema instanceof GraphQLSchema))
    return []
  const fields = connection.schema.getSubscriptionType()?.getFields()
  return fields ? Object.values(fields) : []
})

export const graphqlTypes = computed(() => {
  if (!connection.schema || !(connection.schema instanceof GraphQLSchema))
    return []

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

export const connect = async (
  options: ConnectionRequestOptions,
  isRunGQLOperation = false
) => {
  if (connection.state === "CONNECTED") {
    throw new Error(
      "A connection is already running. Close it before starting another."
    )
  }

  const toast = useToast()
  const t = getI18n()

  connection.state = "CONNECTING"

  const poll = async () => {
    try {
      await getSchema(options)
      if (connection.state !== "CONNECTED") connection.state = "CONNECTED"
      timeoutSubscription = setTimeout(() => {
        poll()
      }, GQL_SCHEMA_POLL_INTERVAL)
    } catch (error) {
      connection.state = "ERROR"

      if (!isRunGQLOperation) {
        toast.error(t("graphql.connection_error_http"))
      }

      console.error(error)
    }
  }

  await poll()
}

export const disconnect = () => {
  if (connection.state !== "CONNECTED") {
    throw new Error("No connections are running to be disconnected")
  }

  clearTimeout(timeoutSubscription)
  connection.state = "DISCONNECTED"
  connection.schema = null
}

export const reset = () => {
  if (connection.state === "CONNECTED") disconnect()

  connection.state = "DISCONNECTED"
  connection.schema = null
}

const getSchema = async (options: ConnectionRequestOptions) => {
  try {
    const { url, request, inheritedHeaders, inheritedAuth } = options

    const headers = request?.headers || []

    const auth =
      request?.auth.authType === "inherit" && request.auth.authActive
        ? clone(inheritedAuth)
        : clone(request.auth)

    let runHeaders: HoppGQLRequest["headers"] = []

    if (inheritedHeaders) {
      runHeaders = [
        ...inheritedHeaders,
        ...clone(request.headers),
      ] as HoppRESTHeaders
    } else {
      runHeaders = clone(request.headers)
    }

    const finalHeaders: Record<string, string> = {}

    const { authHeaders } = await generateAuthHeader(url, auth)

    runHeaders.forEach((header) => {
      if (header.active && header.key !== "") {
        finalHeaders[header.key] = header.value
      }
    })
    Object.assign(finalHeaders, authHeaders)

    headers
      .filter((item) => item.active && item.key !== "")
      .forEach(({ key, value }) => (finalHeaders[key] = value))

    const kernelRequest: RelayRequest = {
      id: Date.now(),
      url: options.url,
      method: "POST" as Method,
      version: "HTTP/1.1",
      headers: {
        ...finalHeaders,
        "content-type": "application/json",
      },
      content: content.json(
        { query: getIntrospectionQuery() },
        MediaType.APPLICATION_JSON
      ),
    }

    const kernelInterceptorService = getService(KernelInterceptorService)
    const { response } = kernelInterceptorService.execute(kernelRequest)

    const res = await response

    if (E.isLeft(res)) {
      connection.state = "ERROR"

      if (res.left !== "cancellation" && typeof res.left === "object") {
        connection.error = {
          type: res.left.error?.kind || "error",
          message: (t: ReturnType<typeof getI18n>) => {
            if (res.left !== "cancellation" && typeof res.left === "object") {
              return (
                res.left.humanMessage?.description(t) ||
                t("graphql.connection_error_http")
              )
            }
            return "Unknown"
          },
          component: res.left.component,
        }
      }

      throw new Error(
        typeof res.left === "string" ? res.left : res.left.error.message
      )
    }

    const data = res.right

    const decoder = new TextDecoder("utf-8")
    const responseText = decoder.decode(data.body.body)

    const introspectResponse = JSON.parse(responseText)

    const schemaData = buildClientSchema(introspectResponse.data)

    connection.schema = schemaData
    connection.error = null
  } catch (e: any) {
    console.error(e)
    disconnect()
  }
}

export const runGQLOperation = async (options: RunQueryOptions) => {
  if (connection.state !== "CONNECTED") {
    await connect(
      {
        url: options.url,
        request: options.request,
        inheritedHeaders: options.inheritedHeaders,
        inheritedAuth: options.inheritedAuth,
      },
      true
    )
  }

  const {
    url,
    request,
    query,
    variables,
    operationName,
    inheritedHeaders,
    inheritedAuth,
    operationType,
  } = options

  const headers = request?.headers || []

  const auth =
    request?.auth.authType === "inherit" && request.auth.authActive
      ? clone(inheritedAuth)
      : clone(request.auth)

  let runHeaders: HoppGQLRequest["headers"] = []

  if (inheritedHeaders) {
    runHeaders = [
      ...inheritedHeaders,
      ...clone(request.headers),
    ] as HoppRESTHeaders
  } else {
    runHeaders = clone(request.headers)
  }

  const finalHeaders: Record<string, string> = {}

  const { authHeaders, authParams } = await generateAuthHeader(url, auth)

  let finalUrl = url
  if (Object.keys(authParams).length > 0) {
    const urlObj = new URL(url)
    for (const [key, value] of Object.entries(authParams)) {
      urlObj.searchParams.append(key, value)
    }
    finalUrl = urlObj.toString()
  }

  runHeaders.forEach((header) => {
    if (header.active && header.key !== "") {
      finalHeaders[header.key] = header.value
    }
  })
  Object.assign(finalHeaders, authHeaders)

  headers
    .filter((item) => item.active && item.key !== "")
    .forEach(({ key, value }) => (finalHeaders[key] = value))

  const finalHoppHeaders: HoppRESTHeaders = Object.entries(finalHeaders).map(
    ([key, value]) => ({
      active: true,
      key,
      value,
      description: "",
    })
  )

  const gqlRequest: HoppGQLRequest = {
    v: 9,
    name: options.name || "Untitled Request",
    url: finalUrl,
    headers: finalHoppHeaders,
    query,
    variables,
    auth: auth ?? request.auth,
  }

  if (operationType === "subscription") {
    return runSubscription(options, finalHeaders)
  }

  try {
    const kernelRequest = await GQLRequest.toRequest(gqlRequest)

    if (operationName) {
      if (kernelRequest.content?.kind === "json") {
        const content = kernelRequest.content.content as any
        content.operationName = operationName
        kernelRequest.content.content = content
      }
    }

    const kernelInterceptorService = getService(KernelInterceptorService)
    const { response } = kernelInterceptorService.execute(kernelRequest)

    const result = await response

    if (E.isLeft(result)) {
      if (result.left !== "cancellation" && typeof result.left === "object") {
        connection.error = {
          type: result.left.error?.kind || "error",
          message: (t: ReturnType<typeof getI18n>) => {
            if (
              result.left !== "cancellation" &&
              typeof result.left === "object"
            ) {
              return (
                result.left.humanMessage?.description(t) ||
                t("graphql.operation_error")
              )
            }
            return "Unknown"
          },
          component: result.left.component,
        }
      }

      throw new Error(
        typeof result.left === "string"
          ? result.left
          : result.left.error.message
      )
    }

    const relayResponse = result.right

    const parsedResponse = await GQLResponse.toResponse(relayResponse, options)

    if (parsedResponse.type === "error") {
      throw new Error(parsedResponse.error.message)
    }

    const timeStart = Date.now()
    const timeEnd = Date.now()

    gqlMessageEvent.value = {
      ...parsedResponse,
      document: {
        type: "success",
        statusCode: relayResponse.status,
        statusText: relayResponse.statusText,
        meta: {
          responseSize: relayResponse.body.body.byteLength,
          responseDuration: timeEnd - timeStart,
        },
      },
    }

    addQueryToHistory(options, parsedResponse.data)

    return parsedResponse.data
  } catch (error: any) {
    gqlMessageEvent.value = {
      type: "error",
      error: {
        type: "network_error",
        message: error.message || "An unknown error occurred",
      },
    }

    throw error
  }
}

const generateAuthHeader = async (
  url: string,
  auth: HoppGQLAuth | undefined
) => {
  const finalHeaders: Record<string, string> = {}
  const params: Record<string, string> = {}

  if (auth?.authActive) {
    if (auth.authType === "basic") {
      const username = auth.username
      const password = auth.password
      finalHeaders.Authorization = `Basic ${btoa(`${username}:${password}`)}`
    } else if (auth.authType === "bearer") {
      finalHeaders.Authorization = `Bearer ${auth.token}`
    } else if (auth.authType === "oauth-2") {
      const { addTo } = auth

      if (addTo === "HEADERS") {
        finalHeaders.Authorization = `Bearer ${auth.grantTypeInfo.token}`
      } else if (addTo === "QUERY_PARAMS") {
        params["access_token"] = auth.grantTypeInfo.token
      }
    } else if (auth.authType === "api-key") {
      const { key, value, addTo } = auth
      if (addTo === "HEADERS") {
        finalHeaders[key] = value
      } else if (addTo === "QUERY_PARAMS") {
        params[key] = value
      }
    } else if (auth.authType === "aws-signature") {
      const { accessKey, secretKey, region, serviceName, addTo, serviceToken } =
        auth

      const currentDate = new Date()
      const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")

      const signer = new AwsV4Signer({
        datetime: amzDate,
        signQuery: addTo === "QUERY_PARAMS",
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        region: region ?? "us-east-1",
        service: serviceName,
        url,
        sessionToken: serviceToken,
      })

      const sign = await signer.sign()

      if (addTo === "HEADERS") {
        sign.headers.forEach((v, k) => {
          finalHeaders[k] = v
        })
      } else if (addTo === "QUERY_PARAMS") {
        for (const [k, v] of sign.url.searchParams) {
          params[k] = v
        }
      }
    }
  }

  return { authHeaders: finalHeaders, authParams: params }
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
          type: "response",
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
  const { name, url, request, query, variables } = options
  addGraphqlHistoryEntry(
    makeGQLHistoryEntry({
      request: makeGQLRequest({
        name: name ?? "Untitled Request",
        url,
        query,
        headers: request.headers,
        variables,
        auth: request.auth as HoppGQLAuth,
      }),
      response,
      star: false,
    })
  )
}
