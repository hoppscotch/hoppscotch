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
import {
  Component,
  ComputedRef,
  Ref,
  computed,
  ref,
  shallowReactive,
  watch,
} from "vue"
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

type WSGraphQLProtocol = "graphql-transport-ws" | "graphql-ws"

/**
 * GraphQL-over-WebSocket message types. Covers both the modern
 * `graphql-transport-ws` protocol and the legacy `subscriptions-transport-ws`
 * (a.k.a. `graphql-ws`) one — we negotiate either at handshake time, so the
 * same dispatcher has to handle frames from both.
 *
 * Modern spec: https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 * Legacy spec: https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md
 */
const GQL_WS_MSG = {
  // Both protocols
  CONNECTION_INIT: "connection_init",
  CONNECTION_ACK: "connection_ack",
  ERROR: "error",
  // Modern only
  PING: "ping",
  PONG: "pong",
  SUBSCRIBE: "subscribe",
  NEXT: "next",
  COMPLETE: "complete",
  // Legacy only
  CONNECTION_ERROR: "connection_error",
  CONNECTION_KEEP_ALIVE: "ka",
  START: "start",
  STOP: "stop",
  DATA: "data",
} as const

type ConnectionError = {
  type: string
  message: (t: ReturnType<typeof getI18n>) => string
  component?: Component
}

type TabConnectionContext = {
  state: ConnectionState
  schema: GraphQLSchema | null
  error: ConnectionError | null
  socket: WebSocket | undefined
  /**
   * Direct reactive field (not a nested Map) so shallowReactive on the
   * context picks up assignments. A previous design wrapped this in a Map
   * keyed by tabId, which made `Map.set(...)` mutations invisible to Vue's
   * reactivity since shallowReactive doesn't deep-wrap.
   */
  subscriptionState?: SubscriptionState
  /** Negotiated WS subprotocol for the current subscription socket */
  wsProtocol?: WSGraphQLProtocol
  /** ID of the in-flight subscription on the current socket */
  activeSubId?: string
  /** Timer that fires if the server never sends connection_ack */
  initAckTimer?: ReturnType<typeof setTimeout>
  /**
   * Promise of an in-flight `connectTab` call. Used to dedupe concurrent
   * connect requests so we don't stack polling loops while a fetchSchema
   * is still resolving.
   */
  connectingPromise?: Promise<void>
}

/**
 * Public, read-only projection of {@link TabConnectionContext}. Consumers get
 * exactly the fields they need to render UI state without being able to mutate
 * the live context or hold a reference to the WebSocket / timers.
 */
export type TabConnectionView = Readonly<{
  state: ConnectionState
  schema: GraphQLSchema | null
  error: ConnectionError | null
  subscriptionState: SubscriptionState | undefined
}>

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

  // Monotonic counter for subscription IDs. graphql-transport-ws lets you
  // multiplex multiple subscriptions on one socket; even though we run one
  // at a time per tab today, using a fresh ID per subscribe avoids server
  // "subscriber already exists" errors (close code 4409) if the server is
  // slow to release the prior id after a complete/close.
  private subIdCounter = 0

  // How long to wait for connection_ack after sending connection_init.
  // Both protocols expect ack to be prompt; the spec's de facto upper bound
  // is single-digit seconds — we use 10s to be lenient on slow networks.
  private static readonly CONNECTION_ACK_TIMEOUT_MS = 10_000

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
          subscriptionState: undefined,
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
   * Read-only view of a tab's connection state. Returns a reactive proxy that
   * exposes only the UI-relevant fields — consumers can't accidentally mutate
   * the live context or hold a reference to the live WebSocket / timers.
   */
  public getTabConnectionState(tabId: string): TabConnectionView {
    const ctx = this.getOrCreateContext(tabId)
    // The proxy is computed-like; each property read goes through the live ctx
    // so reactivity is preserved without exposing assignment.
    return {
      get state() {
        return ctx.state
      },
      get schema() {
        return ctx.schema
      },
      get error() {
        return ctx.error
      },
      get subscriptionState() {
        return ctx.subscriptionState
      },
    } as TabConnectionView
  }

  // Cache of per-tab subscription-state computeds. Without this every call to
  // `getTabSubscriptionState(tabId)` allocates a fresh ComputedRef — wasteful
  // when the result is read inside another computed (e.g. `subscriptionPending`
  // in GqlResponse.vue) which re-evaluates on every change.
  private tabSubscriptionStateRefs = new Map<
    string,
    ComputedRef<SubscriptionState | undefined>
  >()

  /**
   * Reactive subscription state for a specific tab — undefined until a
   * subscription has been initiated. Components read this to toggle
   * Run / Stop buttons and to gate "already subscribed" actions.
   */
  public getTabSubscriptionState(
    tabId: string
  ): ComputedRef<SubscriptionState | undefined> {
    let cached = this.tabSubscriptionStateRefs.get(tabId)
    if (!cached) {
      cached = computed(() => this.getOrCreateContext(tabId).subscriptionState)
      this.tabSubscriptionStateRefs.set(tabId, cached)
    }
    return cached
  }

  /**
   * Stop the active subscription for a tab. Sends a protocol-correct stop
   * frame (`complete` for graphql-transport-ws, `stop` for graphql-ws) so
   * the server can release resources for that operation, then closes the
   * socket. Safe to call when there is no active subscription.
   */
  public unsubscribeTab(tabId: string) {
    const ctx = this.tabContexts.get(tabId)
    if (!ctx) return

    if (
      ctx.socket &&
      ctx.socket.readyState === WebSocket.OPEN &&
      ctx.activeSubId
    ) {
      const isModern = ctx.wsProtocol === "graphql-transport-ws"
      try {
        ctx.socket.send(
          JSON.stringify({
            type: isModern ? GQL_WS_MSG.COMPLETE : GQL_WS_MSG.STOP,
            id: ctx.activeSubId,
          })
        )
      } catch (_e) {
        // swallow — socket may have closed between the readyState check
        // and the send call (race window is small but possible)
      }
    }

    this.teardownSubscriptionSocket(ctx)
    ctx.subscriptionState = "UNSUBSCRIBED"
  }

  private teardownSubscriptionSocket(ctx: TabConnectionContext) {
    if (ctx.initAckTimer) {
      clearTimeout(ctx.initAckTimer)
      ctx.initAckTimer = undefined
    }
    if (ctx.socket) {
      try {
        ctx.socket.close()
      } catch (_e) {
        // swallow
      }
      ctx.socket = undefined
    }
    ctx.activeSubId = undefined
    ctx.wsProtocol = undefined
  }

  /**
   * Maps a WebSocket close code to a human-readable reason.
   * Values come from the `graphql-transport-ws` spec (CloseCode enum); see
   * https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
   */
  private static readonly WS_CLOSE_CODES: Readonly<Record<number, string>> = {
    4004: "Bad response",
    4005: "Internal client error",
    4400: "Bad request",
    4401: "Unauthorized (connection_init missing or rejected)",
    4403: "Forbidden",
    4406: "Subprotocol not acceptable",
    4408: "Connection initialization timeout",
    4409: "Subscriber for this ID already exists",
    4429: "Too many initialization requests",
    4499: "Connection terminated",
    4500: "Internal server error",
    4504: "Connection acknowledgement timeout",
  }

  private describeWSCloseCode(code: number): string {
    return GQLTabConnectionService.WS_CLOSE_CODES[code] ?? "Connection closed"
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

    // De-dupe concurrent connectTab calls. Two near-simultaneous callers
    // (user click + auto-connect from runTabGQLOperation) would otherwise each
    // start their own polling loop, double-firing introspection requests and
    // racing to write ctx.schema.
    if (ctx.connectingPromise) {
      return ctx.connectingPromise
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
          // Use the underlying error message when we have one (e.g.
          // "Introspection response was not valid JSON") so the toast tells
          // the user the actual cause instead of a generic "network error".
          const reason =
            error instanceof Error && error.message
              ? error.message
              : t("graphql.connection_error_http")
          toast.error(reason)
        }
      }
    }

    const pending = poll()
    ctx.connectingPromise = pending
    try {
      await pending
    } finally {
      if (ctx.connectingPromise === pending) {
        ctx.connectingPromise = undefined
      }
    }
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
    // Clear the connect dedup guard as part of the reset. `connectTab` returns
    // an existing `connectingPromise` instead of starting a fresh connect, so a
    // stale one left here would make an immediate reconnect (e.g. the URL-change
    // watcher's disconnect→connect) dedupe against the now-dead attempt and
    // silently no-op. The `=== pending` check in `connectTab`'s finally keeps
    // the in-flight attempt from later clobbering a newer promise.
    ctx.connectingPromise = undefined
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
      // Strip trailing NUL bytes — some kernel transports return a body
      // buffer slightly oversized with `\0` padding (observed against
      // countries.trevorblades.com via the desktop relay). JSON.parse
      // rejects those as "non-whitespace characters after JSON".
      const responseText = decoder.decode(data.body.body).replace(/\0+$/g, "")

      let introspectResponse: { data?: unknown }
      try {
        introspectResponse = JSON.parse(responseText)
      } catch (_parseErr) {
        throw new Error(
          "Introspection response was not valid JSON — the endpoint may not be a GraphQL server."
        )
      }

      // Introspection disabled (e.g. Hasura / Apollo with `introspection: false`):
      // the 200 body carries `errors` and no `data`. `buildClientSchema(undefined)`
      // throws a cryptic graphql-js internal error, so fail with a clear one.
      // Set `ctx.error` too — on a background re-poll the catch below disconnects
      // before `poll()` can toast, so the response-panel error watcher is the
      // only thing left to surface this to the user.
      if (!introspectResponse.data) {
        ctx.error = {
          type: "error",
          message: (t: ReturnType<typeof getI18n>) =>
            t("graphql.connection_error_introspection_disabled"),
        }
        throw new Error("Introspection is disabled on this server.")
      }

      const schemaData = buildClientSchema(introspectResponse.data as any)

      ctx.schema = schemaData
      ctx.error = null
    } catch (e: any) {
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

    // Tear down any prior subscription before starting a new operation. Even
    // a query/mutation must not coexist with an open subscription socket on
    // the same tab — leaving it open leaks the WS and confuses the UI state
    // machine (subscriptionState stuck on "SUBSCRIBED" while the user sees a
    // single-shot response).
    if (ctx.socket) {
      this.teardownSubscriptionSocket(ctx)
      ctx.subscriptionState = "UNSUBSCRIBED"
    }

    if (ctx.state !== "CONNECTED") {
      // Introspection failure is non-fatal — schema is for the docs explorer
      // and autocomplete, not for executing the request. Servers that disable
      // introspection (Hasura prod, Apollo with introspection: false) or
      // return non-JSON for unknown ops would otherwise prevent the user
      // from running any query/mutation/subscription at all.
      try {
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
      } catch (_e) {
        // Swallow — `fetchSchema` already logged the error and `disconnectTab`
        // moved the connection state out of CONNECTING. The execution path
        // below doesn't depend on the schema.
      }
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
      responses: {},
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
    const { url, query, operationName, variables } = options
    const wsUrl = url.replace(/^http/, "ws")

    // Defensive — `runTabGQLOperation` already tears down on the entry path,
    // but `runTabSubscription` is logically self-contained.
    if (ctx.socket) {
      this.teardownSubscriptionSocket(ctx)
    }

    let parsedVariables: unknown
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables)
      } catch {
        parsedVariables = undefined
      }
    }

    // Offer both subprotocols. Server picks one via the standard WS handshake;
    // we read `socket.protocol` after open and branch on that. Modern servers
    // (Postman default, recent Apollo, Hasura, graphql-yoga) speak
    // `graphql-transport-ws`; older `subscriptions-transport-ws` servers
    // speak `graphql-ws`.
    const socket = new WebSocket(wsUrl, ["graphql-transport-ws", "graphql-ws"])
    const subId = `${++this.subIdCounter}`

    ctx.socket = socket
    ctx.activeSubId = subId
    ctx.subscriptionState = "SUBSCRIBING"
    messageEvent.value = "reset"

    // Closure helpers — each subscription captures its own `socket` + `subId`,
    // so the staleness check works for handlers that fire after a teardown or
    // a re-subscribe. Without these, every async callback would have to repeat
    // the same guard inline and the terminal-frame paths would diverge from
    // the ack-timeout path.
    const isCurrentSubscription = () =>
      ctx.socket === socket && ctx.activeSubId === subId

    const failSubscription = (message: string) => {
      if (!isCurrentSubscription()) return
      messageEvent.value = {
        type: "error",
        error: { type: "subscription_error", message },
      }
      this.teardownSubscriptionSocket(ctx)
      ctx.subscriptionState = "UNSUBSCRIBED"
    }

    // Guard against servers that accept the WS handshake but never send
    // `connection_ack` (e.g. a non-GraphQL echo endpoint that just opens a
    // socket). Without this the UI sits in SUBSCRIBING with no feedback.
    ctx.initAckTimer = setTimeout(() => {
      failSubscription(
        `GraphQL server did not acknowledge the connection within ${
          GQLTabConnectionService.CONNECTION_ACK_TIMEOUT_MS / 1000
        }s. The endpoint may not implement graphql-transport-ws or graphql-ws.`
      )
    }, GQLTabConnectionService.CONNECTION_ACK_TIMEOUT_MS)

    socket.onopen = () => {
      if (!isCurrentSubscription()) return

      ctx.wsProtocol =
        socket.protocol === "graphql-transport-ws"
          ? "graphql-transport-ws"
          : "graphql-ws"

      // Per spec, only connection_init goes out now. The subscribe/start
      // frame is held until the server returns connection_ack — sending it
      // early can be rejected with close code 4401 by strict servers.
      socket.send(
        JSON.stringify({
          type: GQL_WS_MSG.CONNECTION_INIT,
          payload: headers ?? {},
        })
      )
    }

    socket.onmessage = (event) => {
      if (!isCurrentSubscription()) return

      let data: any
      try {
        data = JSON.parse(event.data)
      } catch {
        // Non-JSON frame on a graphql-ws socket — log and ignore so we don't
        // crash the message dispatcher.
        console.warn("Discarded non-JSON WS frame on GQL subscription socket")
        return
      }

      switch (data.type) {
        case GQL_WS_MSG.CONNECTION_ACK: {
          if (ctx.initAckTimer) {
            clearTimeout(ctx.initAckTimer)
            ctx.initAckTimer = undefined
          }
          ctx.subscriptionState = "SUBSCRIBED"

          const isModern = ctx.wsProtocol === "graphql-transport-ws"
          socket.send(
            JSON.stringify({
              type: isModern ? GQL_WS_MSG.SUBSCRIBE : GQL_WS_MSG.START,
              id: subId,
              payload: { query, operationName, variables: parsedVariables },
            })
          )
          break
        }

        case GQL_WS_MSG.PING: {
          // Modern protocol heartbeat — must respond with pong or the server
          // closes the connection after its keep-alive window.
          socket.send(JSON.stringify({ type: GQL_WS_MSG.PONG }))
          break
        }

        case GQL_WS_MSG.CONNECTION_KEEP_ALIVE:
        case GQL_WS_MSG.PONG:
          // Legacy keep-alive / modern pong response — nothing to do.
          break

        case GQL_WS_MSG.DATA: // legacy
        case GQL_WS_MSG.NEXT: {
          // modern
          if (data.id && data.id !== subId) break // not our subscription
          messageEvent.value = {
            type: "response",
            time: Date.now(),
            operationName,
            data: JSON.stringify(data.payload),
            operationType: "subscription",
          }
          break
        }

        case GQL_WS_MSG.ERROR: {
          if (data.id && data.id !== subId) break
          // Terminal per spec — the subscription is dead after `error`. Route
          // through failSubscription so we close the socket, clear timers,
          // and flip UI back to Run instead of leaving stale "SUBSCRIBED"
          // state hanging around.
          failSubscription(
            typeof data.payload === "string"
              ? data.payload
              : JSON.stringify(data.payload)
          )
          break
        }

        case GQL_WS_MSG.CONNECTION_ERROR: {
          // Legacy protocol's protocol-level failure (e.g. auth in payload).
          // Terminal per spec — see `error` case.
          failSubscription(
            typeof data.payload === "string"
              ? data.payload
              : JSON.stringify(data.payload ?? "Connection error")
          )
          break
        }

        case GQL_WS_MSG.COMPLETE: {
          if (data.id && data.id !== subId) break
          // Server-initiated end of stream — fully tear down so the socket,
          // activeSubId, and wsProtocol don't outlive the subscription. Any
          // subsequent onclose for this socket short-circuits because
          // `ctx.socket` is already cleared.
          this.teardownSubscriptionSocket(ctx)
          ctx.subscriptionState = "UNSUBSCRIBED"
          break
        }
      }
    }

    socket.onclose = (event) => {
      // Strict staleness check — if `ctx.socket` was cleared (teardown) or
      // replaced (re-subscribe), this close event belongs to a defunct socket
      // and must not touch shared state. Looser checks that allowed
      // `ctx.socket === undefined` here would re-trigger error reporting for
      // sockets we already tore down.
      if (ctx.socket !== socket) return

      if (ctx.initAckTimer) {
        clearTimeout(ctx.initAckTimer)
        ctx.initAckTimer = undefined
      }

      // Fully clear so the next subscription starts from a clean context.
      ctx.socket = undefined
      ctx.activeSubId = undefined
      ctx.wsProtocol = undefined
      ctx.subscriptionState = "UNSUBSCRIBED"

      // Abnormal close codes from graphql-transport-ws spec carry real
      // diagnostic info — surface them so the user can debug auth/payload
      // issues instead of seeing a silent empty panel.
      if (
        event.code !== 1000 && // normal closure
        event.code !== 1001 && // going away
        event.code !== 1005 // no status received
      ) {
        const reason =
          event.reason || this.describeWSCloseCode(event.code) || ""
        messageEvent.value = {
          type: "error",
          error: {
            type: "subscription_error",
            message: `WebSocket closed (code ${event.code})${
              reason ? `: ${reason}` : ""
            }`,
          },
        }
      }
    }

    socket.onerror = (_event) => {
      // Strict staleness check — see onclose.
      if (ctx.socket !== socket) return

      if (ctx.initAckTimer) {
        clearTimeout(ctx.initAckTimer)
        ctx.initAckTimer = undefined
      }
      ctx.subscriptionState = "UNSUBSCRIBED"
      // The browser fires `error` first then `close` — `close` carries the
      // diagnostic code, so we only set a generic message here as a fallback
      // for the rare case where `error` fires without a follow-up close.
      if (!messageEvent.value || messageEvent.value === "reset") {
        messageEvent.value = {
          type: "error",
          error: {
            type: "subscription_error",
            message: `WebSocket connection to ${wsUrl} failed. Check that the endpoint accepts GraphQL over WebSocket.`,
          },
        }
      }
    }

    this.addQueryToHistory(options, "")

    return socket
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
    if (ctx) {
      this.teardownSubscriptionSocket(ctx)
    }

    this.tabContexts.delete(tabId)
    this.tabMessageEvents.delete(tabId)
    this.tabSubscriptionStateRefs.delete(tabId)
  }

  /**
   * Disconnect and clean up all tabs. Call this on page unmount.
   */
  public disconnectAllTabs() {
    for (const [tabId, ctx] of this.tabContexts) {
      const timer = this.tabPollingTimers.get(tabId)
      if (timer) clearTimeout(timer)

      this.teardownSubscriptionSocket(ctx)

      ctx.state = "DISCONNECTED"
      ctx.schema = null
    }

    this.tabPollingTimers.clear()
    this.tabContexts.clear()
    this.tabMessageEvents.clear()
    this.tabSubscriptionStateRefs.clear()
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
          responses: {},
        }),
        response,
        star: false,
      })
    )
  }
}
