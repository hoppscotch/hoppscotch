import { BehaviorSubject, Subject } from "rxjs"
import {
  getIntrospectionQuery,
  buildClientSchema,
  GraphQLSchema,
  printSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLInterfaceType,
} from "graphql"
import { distinctUntilChanged, map } from "rxjs/operators"
import { GQLHeader, HoppGQLAuth, makeGQLRequest } from "@hoppscotch/data"
import { OperationType } from "@urql/core"
import { sendNetworkRequest } from "./network"
import { makeGQLHistoryEntry, addGraphqlHistoryEntry } from "~/newstore/history"

const GQL_SCHEMA_POLL_INTERVAL = 7000

type RunQueryOptions = {
  url: string
  headers: GQLHeader[]
  query: string
  variables: string
  auth: HoppGQLAuth
  operationName: string | undefined
  operationType: OperationType
}

export type GQLEvent = {
  time: number
  operationName: string | undefined
  operationType: OperationType
  data: string
  rawQuery?: RunQueryOptions
}

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

/**
  GQLConnection deals with all the operations (like polling, schema extraction) that runs
  when a connection is made to a GraphQL server.
*/
export class GQLConnection {
  public isLoading$ = new BehaviorSubject<boolean>(false)
  public connected$ = new BehaviorSubject<boolean>(false)
  public subscriptionState$ = new BehaviorSubject<SubscriptionState>(
    "UNSUBSCRIBED"
  )

  public event$: Subject<GQLEvent | "reset"> = new Subject()
  public schema$ = new BehaviorSubject<GraphQLSchema | null>(null)

  socket: WebSocket | undefined

  public schemaString$ = this.schema$.pipe(
    distinctUntilChanged(),
    map((schema) => {
      if (!schema) return null

      return printSchema(schema, {
        commentDescriptions: true,
      })
    })
  )

  public queryFields$ = this.schema$.pipe(
    distinctUntilChanged(),
    map((schema) => {
      if (!schema) return null

      const fields = schema.getQueryType()?.getFields()
      if (!fields) return null

      return Object.values(fields)
    })
  )

  public mutationFields$ = this.schema$.pipe(
    distinctUntilChanged(),
    map((schema) => {
      if (!schema) return null

      const fields = schema.getMutationType()?.getFields()
      if (!fields) return null

      return Object.values(fields)
    })
  )

  public subscriptionFields$ = this.schema$.pipe(
    distinctUntilChanged(),
    map((schema) => {
      if (!schema) return null

      const fields = schema.getSubscriptionType()?.getFields()
      if (!fields) return null

      return Object.values(fields)
    })
  )

  public graphqlTypes$ = this.schema$.pipe(
    distinctUntilChanged(),
    map((schema) => {
      if (!schema) return null

      const typeMap = schema.getTypeMap()

      const queryTypeName = schema.getQueryType()?.name ?? ""
      const mutationTypeName = schema.getMutationType()?.name ?? ""
      const subscriptionTypeName = schema.getSubscriptionType()?.name ?? ""

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
  )

  private timeoutSubscription: any

  public connect(url: string, headers: GQLHeader[], auth: HoppGQLAuth) {
    if (this.connected$.value) {
      throw new Error(
        "A connection is already running. Close it before starting another."
      )
    }

    // Polling
    this.connected$.next(true)

    const poll = async () => {
      await this.getSchema(url, headers, auth)
      this.timeoutSubscription = setTimeout(() => {
        poll()
      }, GQL_SCHEMA_POLL_INTERVAL)
    }
    poll()
  }

  public disconnect() {
    if (!this.connected$.value) {
      throw new Error("No connections are running to be disconnected")
    }

    clearTimeout(this.timeoutSubscription)
    this.connected$.next(false)
  }

  public reset() {
    if (this.connected$.value) this.disconnect()

    this.isLoading$.next(false)
    this.connected$.next(false)
    this.schema$.next(null)
  }

  private async getSchema(
    url: string,
    reqHeaders: GQLHeader[],
    auth: HoppGQLAuth
  ) {
    try {
      this.isLoading$.next(true)

      const introspectionQuery = JSON.stringify({
        query: getIntrospectionQuery(),
      })

      const headers = reqHeaders.filter((x) => x.active && x.key !== "")

      // TODO: Support a better b64 implementation than btoa ?
      if (auth.authType === "basic") {
        const username = auth.username
        const password = auth.password

        headers.push({
          active: true,
          key: "Authorization",
          value: `Basic ${btoa(`${username}:${password}`)}`,
        })
      } else if (auth.authType === "bearer" || auth.authType === "oauth-2") {
        headers.push({
          active: true,
          key: "Authorization",
          value: `Bearer ${auth.token}`,
        })
      } else if (auth.authType === "api-key") {
        const { key, value, addTo } = auth

        if (addTo === "Headers") {
          headers.push({
            active: true,
            key,
            value,
          })
        }
      }

      const finalHeaders: Record<string, string> = {}
      headers.forEach((x) => (finalHeaders[x.key] = x.value))

      const reqOptions = {
        method: "POST",
        url,
        headers: {
          ...finalHeaders,
          "content-type": "application/json",
        },
        data: introspectionQuery,
      }

      const data = await sendNetworkRequest(reqOptions)

      // HACK : Temporary trailing null character issue from the extension fix
      const response = new TextDecoder("utf-8")
        .decode(data.data)
        .replace(/\0+$/, "")

      const introspectResponse = JSON.parse(response)

      const schema = buildClientSchema(introspectResponse.data)

      this.schema$.next(schema)

      this.isLoading$.next(false)
    } catch (e: any) {
      console.error(e)
      this.disconnect()
    }
  }

  public async runQuery(options: RunQueryOptions) {
    const {
      url,
      headers,
      query,
      variables,
      auth,
      operationName,
      operationType,
    } = options

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
      return this.runSubscription(options)
    }

    const res = await sendNetworkRequest(reqOptions)

    // HACK: Temporary trailing null character issue from the extension fix
    const responseText = new TextDecoder("utf-8")
      .decode(res.data)
      .replace(/\0+$/, "")

    this.event$.next({
      time: Date.now(),
      operationName: operationName ?? "query",
      data: responseText,
      rawQuery: options,
      operationType,
    })

    this.addQueryToHistory(options, responseText)

    return responseText
  }

  runSubscription(options: RunQueryOptions) {
    const { url, query, operationName } = options
    const wsUrl = url.replace(/^http/, "ws")

    this.subscriptionState$.next("SUBSCRIBING")

    this.socket = new WebSocket(wsUrl, "graphql-ws")

    this.socket.onopen = (event) => {
      console.log("WebSocket is open now.", event)
      this.socket?.send(
        JSON.stringify({
          type: GQL.CONNECTION_INIT,
          payload: {},
        })
      )

      this.socket?.send(
        JSON.stringify({
          type: GQL.START,
          id: "1",
          payload: { query, operationName },
        })
      )
    }

    this.event$.next("reset")

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case GQL.CONNECTION_ACK: {
          this.subscriptionState$.next("SUBSCRIBED")
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
          this.event$.next({
            time: Date.now(),
            operationName,
            data: JSON.stringify(data.payload),
            operationType: "subscription",
          })
          break
        }
        case GQL.COMPLETE: {
          console.log("completed", data.id)
          break
        }
      }
    }

    this.socket.onclose = (event) => {
      console.log("WebSocket is closed now.", event)
      this.subscriptionState$.next("UNSUBSCRIBED")
    }

    this.addQueryToHistory(options, "")

    return this.socket
  }

  socketDisconnect() {
    this.socket?.close()
  }

  addQueryToHistory(options: RunQueryOptions, response: string) {
    const { url, headers, query, variables, auth } = options
    addGraphqlHistoryEntry(
      makeGQLHistoryEntry({
        request: makeGQLRequest({
          name: "",
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
}
