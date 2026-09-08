import { computed, ref, watchEffect } from "vue"
import { useService } from "dioc/vue"
import type {
  Environment,
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  GraphQLSchema,
  isIntrospectionType,
  isSpecifiedScalarType,
  parse as parseGQL,
  printType,
} from "graphql"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import {
  GQLTabConnectionService,
  type GQLResponseEvent,
} from "~/services/gql-tab-connection.service"
import { WorkspaceService, type Workspace } from "~/services/workspace.service"
import { useReadonlyStream } from "~/composables/stream"
import {
  currentEnvironment$,
  environments$,
  getCurrentEnvironment,
} from "~/newstore/environments"
import { restCollections$ } from "~/newstore/collections"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { AIChatService, type ChatContextItem } from "~/services/ai-chat.service"

export type { ChatContextItem }

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…[truncated]` : value

const serializeRequest = (req: HoppRESTRequest): string => {
  const lines: string[] = [
    "### Current request",
    `${req.method} ${req.endpoint}`,
  ]

  const params = (req.params ?? []).filter((p) => p.active && p.key)
  if (params.length) {
    lines.push(
      "Query params:\n" + params.map((p) => `- ${p.key}: ${p.value}`).join("\n")
    )
  }

  const headers = (req.headers ?? []).filter((h) => h.active && h.key)
  if (headers.length) {
    lines.push(
      "Headers:\n" + headers.map((h) => `- ${h.key}: ${h.value}`).join("\n")
    )
  }

  if (
    req.auth?.authType &&
    req.auth.authType !== "none" &&
    req.auth.authType !== "inherit"
  ) {
    lines.push(`Auth: ${req.auth.authType}`)
  }

  const body = req.body
  if (
    body &&
    "body" in body &&
    typeof body.body === "string" &&
    body.body.trim()
  ) {
    const contentType = "contentType" in body ? body.contentType : "raw"
    lines.push(`Body (${contentType}):\n${truncate(body.body, 1500)}`)
  }

  return lines.join("\n")
}

const serializeResponse = (res: HoppRESTResponse): string => {
  if (res.type !== "success" && res.type !== "failure") return ""

  const lines: string[] = [
    "### Latest response",
    `Status: ${res.statusCode} ${res.statusText}`,
    `Duration: ${res.meta.responseDuration}ms · Size: ${res.meta.responseSize} bytes`,
  ]

  const headers = res.headers.filter((h) => h.key)
  if (headers.length) {
    lines.push(
      "Headers:\n" + headers.map((h) => `- ${h.key}: ${h.value}`).join("\n")
    )
  }

  let bodyText = ""
  try {
    bodyText = new TextDecoder().decode(res.body)
  } catch {
    bodyText = ""
  }
  if (bodyText.trim()) {
    lines.push(`Body (truncated):\n${truncate(bodyText, 1500)}`)
  }

  return lines.join("\n")
}

/**
 * Compact SDL snapshot of an introspected schema. The operation roots
 * (Query / Mutation / Subscription) always ship — they name every operation
 * the endpoint offers — and the remaining named types follow until the
 * budget runs out, since real schemas can be megabytes.
 */
const serializeGQLSchema = (schema: GraphQLSchema): string => {
  const TOTAL_BUDGET = 9000
  const ROOT_BUDGET = 3000

  const parts: string[] = ["### GraphQL schema (introspected)"]
  let used = parts[0].length

  const roots = [
    schema.getQueryType(),
    schema.getMutationType(),
    schema.getSubscriptionType(),
  ].filter((t): t is NonNullable<typeof t> => !!t)
  const rootNames = new Set(roots.map((t) => t.name))

  for (const t of roots) {
    const printed = truncate(printType(t), ROOT_BUDGET)
    parts.push(printed)
    used += printed.length
  }

  let truncated = false
  for (const t of Object.values(schema.getTypeMap())) {
    if (rootNames.has(t.name)) continue
    if (isIntrospectionType(t) || isSpecifiedScalarType(t)) continue
    const printed = printType(t)
    if (used + printed.length > TOTAL_BUDGET) {
      truncated = true
      break
    }
    parts.push(printed)
    used += printed.length
  }
  if (truncated) parts.push("…(schema truncated — more types exist)")

  return parts.join("\n\n")
}

const serializeGQLRequest = (
  req: HoppGQLRequest,
  hasSchema: boolean
): string => {
  const lines: string[] = [
    "### Current request (GraphQL)",
    `POST ${req.url || "—"}`,
  ]

  const headers = (req.headers ?? []).filter((h) => h.active && h.key)
  if (headers.length) {
    lines.push(
      "Headers:\n" + headers.map((h) => `- ${h.key}: ${h.value}`).join("\n")
    )
  }

  if (
    req.auth?.authType &&
    req.auth.authType !== "none" &&
    req.auth.authType !== "inherit"
  ) {
    lines.push(`Auth: ${req.auth.authType}`)
  }

  if (req.query?.trim()) {
    lines.push(`Query:\n${truncate(req.query, 1500)}`)

    // A document can hold several operations — spell them out so the model
    // can pick one via run_request { operation: "<name>" }.
    try {
      const operations = parseGQL(req.query).definitions.filter(
        (d) => d.kind === "OperationDefinition"
      )
      if (operations.length > 1) {
        const names = operations
          .map((d) =>
            d.kind === "OperationDefinition"
              ? `${d.operation}${d.name ? ` ${d.name.value}` : " (unnamed)"}`
              : ""
          )
          .filter(Boolean)
          .join(", ")
        lines.push(
          `The query document contains ${operations.length} operations: ${names}. ` +
            `run_request executes the FIRST one unless you pass its name, ` +
            `e.g. run_request { "operation": "<operationName>" }.`
        )
      }
    } catch (_e) {
      // Unparseable / in-progress query — skip the operation listing.
    }
  }
  if (req.variables?.trim()) {
    lines.push(`Query variables:\n${truncate(req.variables, 500)}`)
  }

  lines.push(
    "Note: this is a GraphQL request tab. You can run it (run_request), save " +
      "it (save_request), and edit it with set_query (the GraphQL query), " +
      "set_gql_variables (the query variables JSON), set_url, " +
      "add_or_update_headers / remove_header, set_bearer_auth, " +
      "set_request_name, and the script tools. Body and query-param tools " +
      "are REST-only." +
      (hasSchema
        ? " The introspected schema is provided in the context — write " +
          "queries/mutations against it."
        : " The endpoint isn't introspected yet — suggest connecting the " +
          "GraphQL tab first before writing operations against unknown fields.")
  )

  return lines.join("\n")
}

/** The most recent settled response event of a GQL tab, if any. */
const lastGQLResponse = (events: GQLResponseEvent[]) => {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === "response") return e
  }
  return null
}

const serializeGQLResponse = (events: GQLResponseEvent[]): string => {
  const last = lastGQLResponse(events)
  if (!last) return ""

  const lines: string[] = ["### Latest response (GraphQL)"]
  const op = [last.operationType, last.operationName].filter(Boolean).join(" ")
  if (op) lines.push(`Operation: ${op}`)
  if (last.document) {
    lines.push(
      `Status: ${last.document.statusCode} ${last.document.statusText}`,
      `Duration: ${last.document.meta.responseDuration}ms · Size: ${last.document.meta.responseSize} bytes`
    )
  }
  if (last.data?.trim()) {
    lines.push(`Body (truncated):\n${truncate(last.data, 1500)}`)
  }

  return lines.join("\n")
}

const serializeEnvironment = (env: Environment, allNames: string[]): string => {
  const keys = (env.variables ?? []).map((v) => v.key).filter(Boolean)
  return [
    "### Active environment",
    `Name: ${env.name || "—"}`,
    `Variables: ${keys.length ? keys.join(", ") : "none"}`,
    `All environments: ${allNames.length ? allNames.join(", ") : "none"}`,
  ].join("\n")
}

/** Compact outline of the collection tree — capped so context stays bounded. */
const serializeCollections = (collections: HoppCollection[]): string => {
  const lines: string[] = ["### Collections"]
  let count = 0
  const MAX = 80

  const walk = (nodes: HoppCollection[], depth: number) => {
    for (const c of nodes) {
      if (count >= MAX) return
      lines.push(`${"  ".repeat(depth)}- ${c.name || "Untitled"}/`)
      count += 1
      for (const req of c.requests ?? []) {
        if (count >= MAX) return
        const r = req as HoppRESTRequest
        lines.push(
          `${"  ".repeat(depth + 1)}- ${r.method ?? "GET"} ${
            r.name || r.endpoint || "request"
          }`
        )
        count += 1
      }
      if (depth < 3) walk(c.folders ?? [], depth + 1)
    }
  }

  walk(collections, 0)
  if (count >= MAX) lines.push("…(truncated)")
  return lines.join("\n")
}

const serializeWorkspace = (ws: Workspace): string =>
  [
    "### Workspace",
    ws.type === "team"
      ? `Team workspace "${ws.teamName}". New environments are created as team environments.`
      : "Personal workspace. New environments are created as personal environments.",
  ].join("\n")

/**
 * Builds the live, toggleable context for the AI chat from whatever the user is
 * currently looking at — the active REST request, its latest response, and the
 * selected environment.
 */
export function useChatContext() {
  const restTabs = useService(WorkspaceTabsService)
  const gqlTabConn = useService(GQLTabConnectionService)
  const chat = useService(AIChatService)
  const workspaceService = useService(WorkspaceService)

  const currentEnv = useReadonlyStream(
    currentEnvironment$,
    getCurrentEnvironment()
  )
  const allEnvironments = useReadonlyStream(environments$, [])
  const collections = useReadonlyStream(restCollections$, [])

  const activeRequestDoc = computed(() => {
    const doc = restTabs.currentActiveTab.value?.document
    return doc && doc.type === "request" ? doc : null
  })

  // The unified workspace also hosts GraphQL request tabs.
  const activeGQLRequestDoc = computed(() => {
    const doc = restTabs.currentActiveTab.value?.document
    return doc && doc.type === "gql-request" ? doc : null
  })

  const items = computed<ChatContextItem[]>(() => {
    const out: ChatContextItem[] = []

    const workspace = workspaceService.currentWorkspace.value
    out.push({
      id: "workspace",
      label: workspace.type === "team" ? workspace.teamName : "Personal",
      detail:
        workspace.type === "team"
          ? `Team workspace: ${workspace.teamName}`
          : "Personal workspace",
      serialize: () => serializeWorkspace(workspace),
    })

    const doc = activeRequestDoc.value
    if (doc?.request) {
      const req = doc.request
      out.push({
        id: "request",
        label: "Request",
        detail: `${req.method} ${req.endpoint || "—"}`,
        serialize: () => serializeRequest(req),
      })

      const res = doc.response
      if (res && (res.type === "success" || res.type === "failure")) {
        out.push({
          id: "response",
          label: "Response",
          detail: `${res.statusCode} ${res.statusText}`,
          serialize: () => serializeResponse(res),
        })
      }
    }

    const gqlDoc = activeGQLRequestDoc.value
    if (gqlDoc?.request) {
      const req = gqlDoc.request
      const schema = gqlTabConn.activeTabSchema.value

      out.push({
        id: "request",
        label: "Request",
        detail: `GQL ${req.url || "—"}`,
        serialize: () => serializeGQLRequest(req, !!schema),
      })

      // The introspected schema (once the tab has connected) — this is what
      // lets the assistant write queries/mutations/subscriptions that exist.
      if (schema) {
        out.push({
          id: "schema",
          label: "Schema",
          detail: "Introspected schema (queries, mutations, subscriptions)",
          serialize: () => serializeGQLSchema(schema),
        })
      }

      const events = gqlDoc.response
      const last = events ? lastGQLResponse(events) : null
      if (events && last) {
        out.push({
          id: "response",
          label: "Response",
          detail: last.document
            ? `${last.document.statusCode} ${last.document.statusText}`
            : "GraphQL response",
          serialize: () => serializeGQLResponse(events),
        })
      }
    }

    const env = currentEnv.value
    if (env) {
      const envNames = (allEnvironments.value ?? [])
        .map((e) => e.name)
        .filter(Boolean)
      out.push({
        id: "environment",
        label: "Environment",
        detail: env.name || "—",
        serialize: () => serializeEnvironment(env, envNames),
      })
    }

    const collectionTree = collections.value ?? []
    if (collectionTree.length) {
      out.push({
        id: "collections",
        label: "Collections",
        detail: `${collectionTree.length} collection${
          collectionTree.length > 1 ? "s" : ""
        }`,
        serialize: () => serializeCollections(collectionTree),
      })
    }

    // Context registered by currently-open surfaces (e.g. modals).
    out.push(...chat.registeredContext.value)

    return out
  })

  // Context ids the user has explicitly toggled off (everything is on by default).
  const excluded = ref<Set<string>>(new Set())

  const isIncluded = (id: string) => !excluded.value.has(id)

  const toggle = (id: string) => {
    const next = new Set(excluded.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    excluded.value = next
  }

  const contextString = computed(() =>
    items.value
      .filter((item) => isIncluded(item.id))
      .map((item) => item.serialize())
      .join("\n\n")
  )

  return { items, isIncluded, toggle, contextString }
}

/**
 * Registers an ad-hoc context item with the AI chat while the calling component
 * considers it "active". Pass a getter returning the item, or `null` when there
 * is nothing to contribute (e.g. a closed modal). The item is automatically
 * unregistered on change/unmount.
 */
export function useChatContextProvider(getItem: () => ChatContextItem | null) {
  const chat = useService(AIChatService)

  watchEffect((onCleanup) => {
    const item = getItem()
    if (!item) return
    onCleanup(chat.registerContext(item))
  })
}
