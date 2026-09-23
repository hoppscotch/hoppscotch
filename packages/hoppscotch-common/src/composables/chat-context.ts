import { computed, ref, shallowRef, watch, watchEffect } from "vue"
import { useService } from "dioc/vue"
import type {
  Environment,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { parse as parseGQL } from "graphql"
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
import { TeamCollectionsService } from "~/services/team-collection.service"
import { teamCollToHoppRESTColl } from "~/helpers/backend/helpers"
import { truncateText } from "~/helpers/aichat/context-serializers"
import { isActionBound } from "~/helpers/actions"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import type { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import type { TeamAccessRole } from "~/helpers/backend/graphql"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import type { HoppTabDocument } from "~/helpers/tab/document"
import type { HoppTab } from "~/services/tab"
import { AIChatService, type ChatContextItem } from "~/services/ai-chat.service"

export type { ChatContextItem }

// Every character here is re-sent on each model round-trip, so the caps are
// deliberately tight — the model asks for more when it needs it.
const BODY_CHARS = 1000
const PAIR_VALUE_CHARS = 120
// URL-bar query strings stay in the endpoint, not the params table.
const URL_CHARS = 2000
const MAX_RESPONSE_HEADERS = 12
const MAX_ENV_NAMES = 20

const OFF_PAGE_NOTE =
  "No request is open: the user is on another page. Request and tab tools refuse until they open the workspace."

/** Puts resolved credentials back behind their references. */
type Mask = (text: string) => string

// Masked before the cut: a truncated credential no longer matches its value.
const clip = (value: string, max: number, mask: Mask) =>
  truncateText(mask(value), max)

/** Header or query-param lines, each value capped. */
const pairLines = (pairs: Array<{ key: string; value: string }>, mask: Mask) =>
  pairs
    .map((p) => `- ${p.key}: ${clip(p.value, PAIR_VALUE_CHARS, mask)}`)
    .join("\n")

const serializeRequest = (req: HoppRESTRequest, mask: Mask): string => {
  const lines: string[] = [
    "### Current request",
    `${req.method} ${clip(req.endpoint, URL_CHARS, mask)}`,
  ]

  if (req.description?.trim()) {
    lines.push(`Documentation:\n${clip(req.description, 400, mask)}`)
  }

  const params = (req.params ?? []).filter((p) => p.active && p.key)
  if (params.length) {
    lines.push("Query params:\n" + pairLines(params, mask))
  }

  const headers = (req.headers ?? []).filter((h) => h.active && h.key)
  if (headers.length) {
    lines.push("Headers:\n" + pairLines(headers, mask))
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
    lines.push(`Body (${contentType}):\n${clip(body.body, BODY_CHARS, mask)}`)
  }

  return lines.join("\n")
}

const serializeResponse = (res: HoppRESTResponse, mask: Mask): string => {
  if (res.type !== "success" && res.type !== "failure") return ""

  const lines: string[] = [
    "### Latest response",
    `Status: ${res.statusCode} ${res.statusText}`,
    `Duration: ${res.meta.responseDuration}ms · Size: ${res.meta.responseSize} bytes`,
  ]

  // Response headers are mostly boilerplate — keep the first few, short.
  const headers = res.headers
    .filter((h: { key: string; value: string }) => h.key)
    .slice(0, MAX_RESPONSE_HEADERS)
  if (headers.length) {
    lines.push("Headers:\n" + pairLines(headers, mask))
  }

  let bodyText = ""
  try {
    bodyText = new TextDecoder().decode(res.body)
  } catch {
    bodyText = ""
  }
  if (bodyText.trim()) {
    lines.push(`Body (truncated):\n${clip(bodyText, BODY_CHARS, mask)}`)
  }

  return lines.join("\n")
}

const serializeGQLRequest = (
  req: HoppGQLRequest,
  hasSchema: boolean,
  mask: Mask
): string => {
  const lines: string[] = [
    "### Current request (GraphQL)",
    `POST ${req.url ? clip(req.url, URL_CHARS, mask) : "—"}`,
  ]

  const headers = (req.headers ?? []).filter((h) => h.active && h.key)
  if (headers.length) {
    lines.push("Headers:\n" + pairLines(headers, mask))
  }

  if (
    req.auth?.authType &&
    req.auth.authType !== "none" &&
    req.auth.authType !== "inherit"
  ) {
    lines.push(`Auth: ${req.auth.authType}`)
  }

  if (req.query?.trim()) {
    lines.push(`Query:\n${clip(req.query, BODY_CHARS, mask)}`)

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
          `Operations in this document: ${names}. Pass the name to run_request to run one.`
        )
      }
    } catch (_e) {
      // Unparseable / in-progress query — skip the operation listing.
    }
  }
  if (req.variables?.trim()) {
    lines.push(`Query variables:\n${clip(req.variables, 500, mask)}`)
  }

  lines.push(
    hasSchema
      ? "GraphQL tab; endpoint introspected — call get_graphql_schema before writing operations."
      : "GraphQL tab; not introspected yet — suggest connecting the tab before writing operations against unknown fields."
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

const serializeGQLResponse = (
  events: GQLResponseEvent[],
  mask: Mask
): string => {
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
    lines.push(`Body (truncated):\n${clip(last.data, BODY_CHARS, mask)}`)
  }

  return lines.join("\n")
}

const serializeEnvironment = (env: Environment, allNames: string[]): string => {
  const keys = (env.variables ?? []).map((v) => v.key).filter(Boolean)
  const names = allNames.slice(0, MAX_ENV_NAMES)
  const more = allNames.length - names.length
  return [
    "### Active environment",
    `Name: ${env.name || "—"}`,
    `Variables: ${keys.length ? keys.join(", ") : "none"}`,
    `All environments: ${
      names.length
        ? names.join(", ") + (more > 0 ? ` (+${more} more)` : "")
        : "none"
    }`,
  ].join("\n")
}

const roleLabel = (role: TeamAccessRole | null | undefined) =>
  role ? ` (${String(role).toLowerCase()})` : ""

const serializeWorkspace = (
  ws: Workspace,
  teams: Array<{ name: string; myRole?: TeamAccessRole | null }>
): string => {
  const names = teams
    .slice(0, MAX_ENV_NAMES)
    .map((t) => `${t.name}${roleLabel(t.myRole)}`)
  const more = teams.length - names.length
  return [
    "### Workspace",
    ws.type === "team"
      ? `Team workspace "${ws.teamName}"${roleLabel(ws.role)}. Collections and environments here are the team's (shared).`
      : "Personal workspace. Collections and environments here are personal.",
    `Your teams: ${
      names.length
        ? names.join(", ") + (more > 0 ? ` (+${more} more)` : "")
        : "none"
    }. Use switch_workspace to change workspace.`,
  ].join("\n")
}

/**
 * Builds the live, toggleable context for the AI chat from whatever the user is
 * currently looking at — the active REST request, its latest response, and the
 * selected environment.
 *
 * @param active Whether the assistant is in use; team environments are only
 * fetched and subscribed to while it is.
 */
export function useChatContext(active: () => boolean = () => true) {
  const restTabs = useService(WorkspaceTabsService)
  const gqlTabConn = useService(GQLTabConnectionService)
  const chat = useService(AIChatService)
  const mask: Mask = (text) => chat.maskLocalSecrets(text)
  const workspaceService = useService(WorkspaceService)

  const currentEnv = useReadonlyStream(
    currentEnvironment$,
    getCurrentEnvironment()
  )
  const allEnvironments = useReadonlyStream(environments$, [])
  const collections = useReadonlyStream(restCollections$, [])

  // Team workspaces: the team list (for switching), team environments (their
  // names), and the team collection tree (roots plus whatever is expanded).
  const teamList = useReadonlyStream(
    workspaceService.acquireTeamListAdapter(null).teamList$,
    []
  )
  const teamEnvironments = shallowRef<TeamEnvironment[]>([])
  const teamCollectionService = useService(TeamCollectionsService)
  // Only pages/index.vue binds this; elsewhere its tabs are hidden.
  const onWorkspacePage = isActionBound("rest.request.open")
  // One adapter per team: a stale fetch can't publish here or subscribe.
  watch(
    () => {
      const ws = workspaceService.currentWorkspace.value
      return active() && ws.type === "team" ? ws.teamID : undefined
    },
    (teamID, _, onCleanup) => {
      teamEnvironments.value = []
      if (!teamID) return
      const adapter = new TeamEnvironmentAdapter(teamID)
      const sub = adapter.teamEnvironmentList$.subscribe(
        (list) => (teamEnvironments.value = [...list])
      )
      // Runs on unmount too; with no team set, a late fetch won't subscribe.
      onCleanup(() => {
        sub.unsubscribe()
        adapter.changeTeamID(undefined)
      })
    },
    { immediate: true }
  )

  /** The context items for `tab` and the workspace around it. */
  const buildItems = (
    tab: HoppTab<HoppTabDocument> | null | undefined
  ): ChatContextItem[] => {
    const out: ChatContextItem[] = []
    const offPage = !onWorkspacePage.value

    const workspace = workspaceService.currentWorkspace.value
    out.push({
      id: "workspace",
      label: workspace.type === "team" ? workspace.teamName : "Personal",
      detail:
        workspace.type === "team"
          ? `Team workspace: ${workspace.teamName}`
          : "Personal workspace",
      serialize: () =>
        serializeWorkspace(workspace, teamList.value ?? []) +
        (offPage ? `\n${OFF_PAGE_NOTE}` : ""),
    })

    const tabDoc = offPage ? undefined : tab?.document
    const doc = tabDoc?.type === "request" ? tabDoc : null
    if (doc?.request) {
      const req = doc.request
      out.push({
        id: "request",
        label: "Request",
        detail: `${req.method} ${req.endpoint || "—"}`,
        serialize: () => serializeRequest(req, mask),
      })

      const res = doc.response
      if (res && (res.type === "success" || res.type === "failure")) {
        out.push({
          id: "response",
          label: "Response",
          detail: `${res.statusCode} ${res.statusText}`,
          serialize: () => serializeResponse(res, mask),
        })
      }
    }

    // The unified workspace also hosts GraphQL request tabs.
    const gqlDoc = tabDoc?.type === "gql-request" ? tabDoc : null
    if (tab && gqlDoc?.request) {
      const req = gqlDoc.request
      const schema =
        tab.id === restTabs.currentActiveTab.value?.id
          ? gqlTabConn.activeTabSchema.value
          : gqlTabConn.getTabConnectionState(tab.id).schema

      out.push({
        id: "request",
        label: "Request",
        detail: `GQL ${req.url || "—"}`,
        serialize: () => serializeGQLRequest(req, !!schema, mask),
      })

      // The introspected schema (once the tab has connected) — this is what
      // lets the assistant write queries/mutations/subscriptions that exist.
      if (schema) {
        out.push({
          id: "schema",
          label: "Schema",
          detail: "Introspected schema (queries, mutations, subscriptions)",
          // The SDL is large and rarely needed — the assistant fetches it
          // with get_graphql_schema when it writes an operation.
          serialize: () =>
            "### GraphQL schema\nIntrospected and available — call get_graphql_schema for the operation roots and types before writing queries.",
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
          serialize: () => serializeGQLResponse(events, mask),
        })
      }
    }

    const env = currentEnv.value
    if (env) {
      const envNames = (
        workspace.type === "team"
          ? (teamEnvironments.value ?? []).map((e) => e.environment.name)
          : (allEnvironments.value ?? []).map((e) => e.name)
      ).filter(Boolean)
      out.push({
        id: "environment",
        label: "Environment",
        detail: env.name || "—",
        serialize: () => serializeEnvironment(env, envNames),
      })
    }

    const collectionTree =
      workspace.type === "team"
        ? (teamCollectionService.collections.value ?? []).flatMap((c) => {
            // A single collection with malformed `data` must not take the
            // whole context down.
            try {
              return [teamCollToHoppRESTColl(c)]
            } catch (_e) {
              return []
            }
          })
        : (collections.value ?? [])
    if (collectionTree.length) {
      const names = collectionTree
        .map((c) => c.name || "Untitled")
        .slice(0, MAX_ENV_NAMES)
      const more = collectionTree.length - names.length
      out.push({
        id: "collections",
        label: "Collections",
        detail: `${collectionTree.length} collection${
          collectionTree.length > 1 ? "s" : ""
        }`,
        // Names only; the outline with requests is fetched on demand via
        // list_collections (it is the largest piece of context otherwise).
        serialize: () =>
          `### Collections\n${names.join(", ")}${
            more > 0 ? ` (+${more} more)` : ""
          } — call list_collections for the outline with folders and requests.`,
      })
    }

    // Context registered by currently-open surfaces (e.g. modals).
    out.push(...chat.registeredContext.value)

    return out
  }

  const items = computed(() => buildItems(restTabs.currentActiveTab.value))

  // Context ids the user has explicitly toggled off (everything is on by default).
  const excluded = ref<Set<string>>(new Set())

  const isIncluded = (id: string) => !excluded.value.has(id)

  const toggle = (id: string) => {
    const next = new Set(excluded.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    excluded.value = next
  }

  // A credential the chat resolved into the request goes back as its reference.
  const serializeItems = (list: ChatContextItem[]) =>
    chat.maskLocalSecrets(
      list
        .filter((item) => isIncluded(item.id))
        .map((item) => item.serialize())
        .join("\n\n")
    )

  /**
   * The context for the tab a turn is pinned to (null: the active one), built
   * fresh on each call so every step sees what the last one opened or ran.
   * Never cached: the secrets to mask aren't reactive.
   */
  const contextFor = (tabId: string | null) => {
    const active = restTabs.currentActiveTab.value
    const tab =
      !tabId || active?.id === tabId
        ? active
        : restTabs.getActiveTabs().value.find((t) => t.id === tabId)
    return serializeItems(buildItems(tab))
  }

  return { items, isIncluded, toggle, contextFor }
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
