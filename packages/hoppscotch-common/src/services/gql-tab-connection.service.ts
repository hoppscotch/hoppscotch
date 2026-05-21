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
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
} from "graphql"
import { Service } from "dioc"
import { Component, Ref, computed, ref, shallowReactive, watch } from "vue"
import { useToast } from "~/composables/toast"
import { getI18n } from "~/modules/i18n"

import { addGraphqlHistoryEntry, makeGQLHistoryEntry } from "~/newstore/history"

import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"

import { MediaType, content, Method, RelayRequest } from "@hoppscotch/kernel"
import { GQLRequest } from "~/helpers/kernel/gql/request"
import { GQLResponse } from "~/helpers/kernel/gql/response"

import { useExplorer } from "~/helpers/graphql/explorer"

import { getEffectiveHoppGQLRequest } from "~/helpers/utils/EffectiveURL"
import { getAggregateEnvsWithCurrentValue } from "~/newstore/environments"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"
import type { Environment } from "@hoppscotch/data"
import type { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

// --- Types (defined locally so new-flow consumers don't depend on connection.ts) ---

export type ConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"

export type SubscriptionState = "SUBSCRIBING" | "SUBSCRIBED" | "UNSUBSCRIBED"

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

const GQL_SCHEMA_POLL_INTERVAL = 7000

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

export type ConnectionRequestOptions = {
  url: string
  request: HoppGQLRequest
  inheritedHeaders: HoppGQLRequest["headers"]
  inheritedAuth?: HoppGQLAuth
  /**
   * Inherited collection-level variables cascaded from parent folders
   * (typically `tab.document.inheritedProperties.variables`). When present,
   * these are merged into the env list used to template URL/headers/auth/etc.
   * — `<<myCollectionVar>>` defined on a team folder resolves here.
   */
  inheritedVariables?: HoppInheritedProperty["variables"]
}

export type RunQueryOptions = {
  name?: string
  url: string
  request: HoppGQLRequest
  inheritedHeaders: HoppGQLRequest["headers"]
  inheritedAuth?: HoppGQLAuth
  /**
   * Inherited collection-level variables cascaded from parent folders
   * (typically `tab.document.inheritedProperties.variables`). When present,
   * these are merged into the env list used to template the GraphQL request.
   */
  inheritedVariables?: HoppInheritedProperty["variables"]
  query: string
  variables: string
  operationName: string | undefined
  operationType: OperationType
}

type TabConnectionContext = {
  state: ConnectionState
  schema: GraphQLSchema | null
  error: {
    type: string
    message: (t: ReturnType<typeof getI18n>) => string
    component?: Component
  } | null
  socket: WebSocket | undefined
  subscriptionState: Map<string, SubscriptionState>
}

/**
 * DIOC service that manages independent GraphQL connections per tab.
 *
 * Each GQL tab on the REST page gets its own connection state, schema,
 * polling timer, WebSocket, and response event stream. Completely
 * independent from connection.ts — the old GQL page (pages/graphql.vue)
 * uses connection.ts directly without interference.
 */
export class GQLTabConnectionService extends Service {
  public static readonly ID = "GQL_TAB_CONNECTION_SERVICE"

  private readonly interceptorService = this.bind(KernelInterceptorService)
  private readonly restTabService = this.bind(WorkspaceTabsService)

  // Active GQL tab ID — tracks which GQL tab is currently focused
  private _activeGQLTabId = ref<string>("")

  // Per-tab connection state — shallowReactive so the Map tracks key add/delete
  // but doesn't deeply unwrap values (which would strip GraphQLSchema class properties)
  private tabContexts = shallowReactive(new Map<string, TabConnectionContext>())

  // Per-tab schema polling timers (non-reactive, just timeouts)
  private tabPollingTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // Per-tab response event refs
  private tabMessageEvents = new Map<
    string,
    Ref<GQLResponseEvent | "reset" | undefined>
  >()

  override onServiceInit() {
    this.setupActiveTabTracking()
  }

  /**
   * Track the active GQL tab. Empty when the active tab is not a GQL request.
   *
   * Source must depend on BOTH the tab reference AND `document.type` so an
   * in-place protocol flip (REST → GQL on the same tab, via ProtocolSwitcher)
   * is detected — that path reassigns `tab.document` but keeps the same tab
   * object, so watching `currentActiveTab.value` alone would never fire.
   */
  private setupActiveTabTracking() {
    const { reset: resetExplorer } = useExplorer()

    const computedActiveGQLTabId = computed(() => {
      const tab = this.restTabService.currentActiveTab.value
      return tab?.document.type === "gql-request" ? tab.id : ""
    })

    watch(
      computedActiveGQLTabId,
      (newId, oldId) => {
        if (newId !== oldId) {
          resetExplorer()
        }
        this._activeGQLTabId.value = newId
      },
      { immediate: true }
    )
  }

  // --- Lazy initialization helpers ---

  private getOrCreateContext(tabId: string): TabConnectionContext {
    if (!this.tabContexts.has(tabId)) {
      // Use shallowReactive so property assignments (ctx.state, ctx.schema)
      // are tracked, but values like GraphQLSchema aren't deeply unwrapped
      // (which would strip class-private properties and break the type)
      this.tabContexts.set(
        tabId,
        shallowReactive<TabConnectionContext>({
          state: "DISCONNECTED",
          schema: null,
          error: null,
          socket: undefined,
          subscriptionState: new Map(),
        })
      )
    }
    return this.tabContexts.get(tabId)!
  }

  /**
   * Get the per-tab message event ref.
   * Components should watch this to receive responses for a specific tab.
   */
  public getTabMessageEvent(
    tabId: string
  ): Ref<GQLResponseEvent | "reset" | undefined> {
    if (!this.tabMessageEvents.has(tabId)) {
      this.tabMessageEvents.set(
        tabId,
        ref<GQLResponseEvent | "reset" | undefined>()
      )
    }
    return this.tabMessageEvents.get(tabId)!
  }

  /**
   * Get the reactive connection state for a specific tab.
   */
  public getTabConnectionState(tabId: string): TabConnectionContext {
    return this.getOrCreateContext(tabId)
  }

  /**
   * The active GQL tab's ID (if the current REST tab is a GQL tab).
   */
  public activeGQLTabId = computed(() => this._activeGQLTabId.value)

  /**
   * Computed schema for the active GQL tab.
   * Sidebar components should use this instead of connection.ts's schema.
   */
  public activeTabSchema = computed(() => {
    const tabId = this._activeGQLTabId.value
    if (!tabId) return null
    const ctx = this.tabContexts.get(tabId)
    return ctx?.schema ?? null
  })

  /**
   * Computed schema string (SDL) for the active GQL tab.
   */
  public activeTabSchemaString = computed(() => {
    const schema = this.activeTabSchema.value
    if (!schema || !(schema instanceof GraphQLSchema)) return ""
    return printSchema(schema)
  })

  // --- Connection management ---

  /**
   * Connect a specific tab — starts introspection and schema polling.
   */
  public async connectTab(
    tabId: string,
    options: ConnectionRequestOptions,
    isRunGQLOperation = false
  ) {
    const ctx = this.getOrCreateContext(tabId)

    // Already connected — no-op to avoid crashing callers
    if (ctx.state === "CONNECTED") {
      return
    }

    const toast = useToast()
    const t = getI18n()

    ctx.state = "CONNECTING"

    const poll = async () => {
      try {
        await this.fetchSchema(tabId, options)
        const currentCtx = this.getOrCreateContext(tabId)
        // Stop polling if disconnected while fetch was in-flight
        if (currentCtx.state === "DISCONNECTED") return
        // Only promote to CONNECTED when we actually have a schema in hand.
        // Without this guard, a silently-failed introspection would leave the
        // UI showing "Disconnect" while the docs/schema panel sees `null` and
        // renders the empty placeholder.
        if (!currentCtx.schema) return
        if (currentCtx.state !== "CONNECTED") currentCtx.state = "CONNECTED"

        const timer = setTimeout(() => {
          poll()
        }, GQL_SCHEMA_POLL_INTERVAL)
        this.tabPollingTimers.set(tabId, timer)
      } catch (error) {
        const currentCtx = this.getOrCreateContext(tabId)
        // Don't overwrite DISCONNECTED state if user disconnected during fetch
        if (currentCtx.state === "DISCONNECTED") return
        currentCtx.state = "ERROR"

        if (!isRunGQLOperation) {
          toast.error(t("graphql.connection_error_http"))
        }

        console.error(error)
      }
    }

    await poll()
  }

  /**
   * Disconnect a specific tab — stops polling, clears schema.
   */
  public disconnectTab(tabId: string) {
    const ctx = this.getOrCreateContext(tabId)

    // Already disconnected — no-op
    if (ctx.state === "DISCONNECTED") {
      return
    }

    // Stop any pending polling timer
    const timer = this.tabPollingTimers.get(tabId)
    if (timer) clearTimeout(timer)
    this.tabPollingTimers.delete(tabId)

    ctx.state = "DISCONNECTED"
    ctx.schema = null
  }

  /**
   * Reset a specific tab's connection. If connected, disconnects first.
   */
  public resetTab(tabId: string) {
    const ctx = this.getOrCreateContext(tabId)
    if (ctx.state === "CONNECTED") {
      this.disconnectTab(tabId)
    }
    ctx.state = "DISCONNECTED"
    ctx.schema = null
  }

  // --- Schema fetching ---

  private async fetchSchema(tabId: string, options: ConnectionRequestOptions) {
    const ctx = this.getOrCreateContext(tabId)

    try {
      const {
        url,
        request,
        inheritedHeaders,
        inheritedAuth,
        inheritedVariables,
      } = options

      // Template env vars before introspection — URL, headers, auth.
      // Merge inherited collection variables (cascaded from parent team/personal
      // folders) at the head of the env list so they outrank selected/global
      // env vars when keys collide (matches REST precedence).
      const inheritedVarsEnv = inheritedVariables
        ? transformInheritedCollectionVariablesToAggregateEnv(
            inheritedVariables
          )
        : []
      const envVars = [
        ...inheritedVarsEnv,
        ...getAggregateEnvsWithCurrentValue(),
      ] as Environment["variables"]
      const effective = getEffectiveHoppGQLRequest(request, envVars, {
        inheritedHeaders,
        inheritedAuth,
        url,
      })

      const finalHeaders: Record<string, string> = {}

      const { authHeaders } = await this.generateAuthHeader(
        effective.effectiveFinalURL,
        effective.effectiveFinalAuth
      )

      // Precedence (matches the original behavior): request > auth > inherited.
      effective.effectiveFinalHeaders.forEach((header) => {
        finalHeaders[header.key] = header.value
      })
      Object.assign(finalHeaders, authHeaders)
      effective.effectiveFinalRequestHeaders.forEach((header) => {
        finalHeaders[header.key] = header.value
      })

      const kernelRequest: RelayRequest = {
        id: Date.now(),
        url: effective.effectiveFinalURL,
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

      const { response } = this.interceptorService.execute(kernelRequest)

      const res = await response

      if (E.isLeft(res)) {
        ctx.state = "ERROR"

        if (res.left !== "cancellation" && typeof res.left === "object") {
          ctx.error = {
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

      ctx.schema = schemaData
      ctx.error = null
    } catch (e: any) {
      console.error(e)
      // Mid-poll failure on an already-connected tab: drop the connection.
      // The disconnect resets state to DISCONNECTED so poll()'s post-await
      // guard short-circuits and stops scheduling further polls.
      if (ctx.state === "CONNECTED") {
        this.disconnectTab(tabId)
      }
      // Re-throw so the initial-connect path in poll() catches this and
      // surfaces the error. Without this, poll() would treat the failed
      // introspection as a success and force ctx.state to CONNECTED even
      // though ctx.schema is still null — leaving the UI "connected" but
      // with no schema for the docs explorer to render.
      throw e
    }
  }

  // --- Query/Mutation execution ---

  /**
   * Run a GQL query or mutation. Captures the current tab ID at call time
   * and routes the response to that tab's message event — even if the user
   * switches tabs before the response arrives.
   */
  public async runTabGQLOperation(tabId: string, options: RunQueryOptions) {
    const ctx = this.getOrCreateContext(tabId)
    const messageEvent = this.getTabMessageEvent(tabId)

    if (ctx.state !== "CONNECTED") {
      await this.connectTab(
        tabId,
        {
          url: options.url,
          request: options.request,
          inheritedHeaders: options.inheritedHeaders,
          inheritedAuth: options.inheritedAuth,
          inheritedVariables: options.inheritedVariables,
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
      inheritedVariables,
      operationType,
    } = options

    // Resolve env variables in URL / headers / auth / query / variables before
    // anything reaches the wire. Mirrors REST's `getEffectiveRESTRequest` flow.
    // Inherited collection variables (cascaded from parent team/personal folders)
    // sit at the head of the list so they outrank selected/global env vars.
    const inheritedVarsEnv = inheritedVariables
      ? transformInheritedCollectionVariablesToAggregateEnv(inheritedVariables)
      : []
    const envVars = [
      ...inheritedVarsEnv,
      ...getAggregateEnvsWithCurrentValue(),
    ] as Environment["variables"]
    const effective = getEffectiveHoppGQLRequest(request, envVars, {
      inheritedHeaders,
      inheritedAuth,
      url,
      query,
      variables,
    })

    const finalHeaders: Record<string, string> = {}

    const { authHeaders, authParams } = await this.generateAuthHeader(
      effective.effectiveFinalURL,
      effective.effectiveFinalAuth
    )

    let finalUrl = effective.effectiveFinalURL
    if (Object.keys(authParams).length > 0) {
      const urlObj = new URL(finalUrl)
      for (const [key, value] of Object.entries(authParams)) {
        urlObj.searchParams.append(key, value)
      }
      finalUrl = urlObj.toString()
    }

    // Precedence (matches the original behavior): request > auth > inherited.
    // Apply inherited+request first, then auth (overrides), then request again
    // so user-supplied headers always beat computed auth headers.
    effective.effectiveFinalHeaders.forEach((header) => {
      finalHeaders[header.key] = header.value
    })
    Object.assign(finalHeaders, authHeaders)
    effective.effectiveFinalRequestHeaders.forEach((header) => {
      finalHeaders[header.key] = header.value
    })

    const finalHoppHeaders: HoppRESTHeaders = Object.entries(finalHeaders).map(
      ([key, value]) => ({
        active: true,
        key,
        value,
        description: "",
      })
    )

    const gqlRequest: HoppGQLRequest = {
      v: 10,
      name: options.name || "Untitled Request",
      url: finalUrl,
      headers: finalHoppHeaders,
      query: effective.effectiveFinalQuery,
      variables: effective.effectiveFinalVariables,
      auth: effective.effectiveFinalAuth,
      description: null,
    }

    if (operationType === "subscription") {
      // Hand the subscription path templated URL + query so the WS payload
      // resolves the same way the HTTP path does.
      return this.runTabSubscription(
        tabId,
        {
          ...options,
          url: finalUrl,
          query: effective.effectiveFinalQuery,
        },
        finalHeaders
      )
    }

    try {
      const kernelRequest = await GQLRequest.toRequest(gqlRequest)

      if (operationName) {
        if (kernelRequest.content?.kind === "json") {
          const jsonContent = kernelRequest.content.content as any
          jsonContent.operationName = operationName
          kernelRequest.content.content = jsonContent
        }
      }

      const { response } = this.interceptorService.execute(kernelRequest)

      const timeStart = Date.now()
      const result = await response

      if (E.isLeft(result)) {
        if (result.left !== "cancellation" && typeof result.left === "object") {
          ctx.error = {
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

      const parsedResponse = await GQLResponse.toResponse(
        relayResponse,
        options
      )

      if (parsedResponse.type === "error") {
        throw new Error(parsedResponse.error.message)
      }

      const timeEnd = Date.now()

      // Route response to the captured tab's message event
      messageEvent.value = {
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

      this.addQueryToHistory(options, parsedResponse.data)

      return parsedResponse.data
    } catch (error: any) {
      // Route error to the captured tab's message event
      messageEvent.value = {
        type: "error",
        error: {
          type: "network_error",
          message: error.message || "An unknown error occurred",
        },
      }

      throw error
    }
  }

  // --- Subscription execution ---

  private runTabSubscription(
    tabId: string,
    options: RunQueryOptions,
    headers?: Record<string, string>
  ) {
    const ctx = this.getOrCreateContext(tabId)
    const messageEvent = this.getTabMessageEvent(tabId)
    const { url, query, operationName } = options
    const wsUrl = url.replace(/^http/, "ws")

    ctx.subscriptionState.set(tabId, "SUBSCRIBING")
    ctx.socket = new WebSocket(wsUrl, "graphql-ws")

    ctx.socket.onopen = (_event) => {
      ctx.socket?.send(
        JSON.stringify({
          type: GQL.CONNECTION_INIT,
          payload: headers ?? {},
        })
      )

      ctx.socket?.send(
        JSON.stringify({
          type: GQL.START,
          id: "1",
          payload: { query, operationName },
        })
      )
    }

    messageEvent.value = "reset"

    ctx.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case GQL.CONNECTION_ACK: {
          ctx.subscriptionState.set(tabId, "SUBSCRIBED")
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
          messageEvent.value = {
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

    ctx.socket.onclose = (_event) => {
      ctx.subscriptionState.set(tabId, "UNSUBSCRIBED")
    }

    this.addQueryToHistory(options, "")

    return ctx.socket
  }

  // --- Cleanup ---

  /**
   * Full cleanup for a specific tab: stop polling, close socket, remove state.
   * Call this when a GQL tab is closed.
   */
  public cleanupTab(tabId: string) {
    const timer = this.tabPollingTimers.get(tabId)
    if (timer) clearTimeout(timer)
    this.tabPollingTimers.delete(tabId)

    const ctx = this.tabContexts.get(tabId)
    if (ctx?.socket) {
      ctx.socket.close()
    }

    this.tabContexts.delete(tabId)
    this.tabMessageEvents.delete(tabId)
  }

  /**
   * Disconnect and clean up all tabs. Call this on page unmount.
   */
  public disconnectAllTabs() {
    for (const [tabId, ctx] of this.tabContexts) {
      const timer = this.tabPollingTimers.get(tabId)
      if (timer) clearTimeout(timer)

      if (ctx.socket) {
        ctx.socket.close()
      }

      ctx.state = "DISCONNECTED"
      ctx.schema = null
    }

    this.tabPollingTimers.clear()
    this.tabContexts.clear()
    this.tabMessageEvents.clear()
  }

  // --- Auth header generation ---

  private async generateAuthHeader(
    url: string,
    auth: HoppGQLAuth | undefined
  ): Promise<{
    authHeaders: Record<string, string>
    authParams: Record<string, string>
  }> {
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
        const {
          accessKey,
          secretKey,
          region,
          serviceName,
          addTo,
          serviceToken,
        } = auth

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

  // --- History ---

  private addQueryToHistory(options: RunQueryOptions, response: string) {
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
          description: request.description ?? null,
        }),
        response,
        star: false,
      })
    )
  }
}
