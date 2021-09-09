import { BehaviorSubject } from "rxjs"
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
import { sendNetworkRequest } from "./network"
import { GQLHeader } from "./types/HoppGQLRequest"

const GQL_SCHEMA_POLL_INTERVAL = 7000

/**
  GQLConnection deals with all the operations (like polling, schema extraction) that runs
  when a connection is made to a GraphQL server.
*/
export class GQLConnection {
  public isLoading$ = new BehaviorSubject<boolean>(false)
  public connected$ = new BehaviorSubject<boolean>(false)
  public schema$ = new BehaviorSubject<GraphQLSchema | null>(null)

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

  public connect(url: string, headers: GQLHeader[]) {
    if (this.connected$.value) {
      throw new Error(
        "A connection is already running. Close it before starting another."
      )
    }

    // Polling
    this.connected$.next(true)

    const poll = async () => {
      await this.getSchema(url, headers)
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

  private async getSchema(url: string, headers: GQLHeader[]) {
    try {
      this.isLoading$.next(true)

      const introspectionQuery = JSON.stringify({
        query: getIntrospectionQuery(),
      })

      const finalHeaders: Record<string, string> = {}
      headers
        .filter((x) => x.active && x.key !== "")
        .forEach((x) => (finalHeaders[x.key] = x.value))

      const reqOptions = {
        method: "post",
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

  public async runQuery(
    url: string,
    headers: GQLHeader[],
    query: string,
    variables: string
  ) {
    const finalHeaders: Record<string, string> = {}
    headers
      .filter((item) => item.active && item.key !== "")
      .forEach(({ key, value }) => (finalHeaders[key] = value))

    const parsedVariables = JSON.parse(variables || "{}")

    const reqOptions = {
      method: "post",
      url,
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      data: JSON.stringify({
        query,
        variables: parsedVariables,
      }),
    }

    const res = await sendNetworkRequest(reqOptions)

    // HACK: Temporary trailing null character issue from the extension fix
    const responseText = new TextDecoder("utf-8")
      .decode(res.data)
      .replace(/\0+$/, "")

    return responseText
  }
}
