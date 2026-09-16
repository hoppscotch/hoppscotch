import { parsePairs } from "~/helpers/aichat/commands"

/**
 * "App action" chat tools operate on the app / workspace (running, saving, tab
 * management, interceptor / environment selection) rather than mutating the
 * active request's fields — that is `applyToolCall`'s job (see `./commands`).
 *
 * These are executed in `AIChatService` because they need `invokeAction` and
 * dioc services, but the tool-name contract mirrors the schemas defined in the
 * backend chat service exactly.
 */
export const APP_ACTION_TOOLS = new Set<string>([
  "run_request",
  "save_request",
  "open_new_tab",
  "close_tab",
  "duplicate_tab",
  "switch_tab",
  "switch_protocol",
  "set_interceptor",
  "create_environment",
  "select_environment",
  "add_or_update_environment_variables",
  "create_collection",
  "save_request_to_collection",
  "add_or_update_collection_requests",
  "open_request",
  "run_collection",
  "create_team",
  "switch_workspace",
  "rename_team",
  "create_folder",
  "rename_collection",
  "delete_collection",
  "set_collection_properties",
  "set_request_description",
  "set_collection_description",
  "publish_documentation",
  "unpublish_documentation",
  "create_mock_server",
  "list_mock_servers",
  "update_mock_server",
  "delete_mock_server",
  "get_graphql_schema",
  "list_collections",
])

/** A stopword name that shouldn't be treated as a real environment name. */
const isEnvStopword = (s: string) =>
  !s || /^(?:the|an?|my|environment|env|to)$/i.test(s)

export interface AppActionCall {
  name: string
  input: Record<string, unknown>
}

/**
 * Offline stand-in for app-action tool use: maps a free-text message to one of
 * the app-action tools, or `null` when the message isn't an app-action command
 * (so the caller can fall back to request-editing / a normal reply).
 */
export function parseAppActionCommand(text: string): AppActionCall | null {
  const t = text.trim()

  // Questions shouldn't be treated as (loosely-matched) environment commands.
  const looksLikeQuestion =
    /\?\s*$/.test(t) ||
    /^(?:what|how|why|when|where|which|who|can|could|would|is|are|do|does|should|tell|explain|list|show)\b/i.test(
      t
    )

  // Run / send the request
  if (
    /^(?:run|send|execute|fire)(?:\s+(?:the|this|that))?(?:\s+(?:request|query|it|this))?\s*[.!?]*$/i.test(
      t
    )
  ) {
    return { name: "run_request", input: {} }
  }

  // Save the request (but not "save … into a collection", handled below)
  if (
    !/\bcollection\b/i.test(t) &&
    (/^save\b/i.test(t) ||
      (/\bsave\b/i.test(t) && /\brequest\b|\bit\b|\bthis\b/i.test(t)))
  ) {
    return { name: "save_request", input: {} }
  }

  // Protocol switch (before tab management so "switch this tab to graphql"
  // isn't read as a next/prev tab switch)
  if (
    /\b(?:switch|change|convert|make|turn)\b/i.test(t) &&
    /\b(?:graphql|gql|rest|http)\b/i.test(t) &&
    /\btab\b|\brequest\b|\bprotocol\b/i.test(t)
  ) {
    if (/\b(?:graphql|gql)\b/i.test(t)) {
      return { name: "switch_protocol", input: { protocol: "graphql" } }
    }
    if (/\brest\b|\bhttp\b/i.test(t)) {
      return { name: "switch_protocol", input: { protocol: "rest" } }
    }
  }

  // Tab management
  if (/\bduplicate\b/i.test(t) && /\btab\b|\brequest\b/i.test(t)) {
    return { name: "duplicate_tab", input: {} }
  }
  if (/\bclose\b/i.test(t) && /\btab\b/i.test(t)) {
    return { name: "close_tab", input: {} }
  }
  if (/\b(?:new|open|create|add)\b/i.test(t) && /\btab\b/i.test(t)) {
    return { name: "open_new_tab", input: {} }
  }
  if (/\btab\b/i.test(t)) {
    if (/\bfirst\b/i.test(t))
      return { name: "switch_tab", input: { direction: "first" } }
    if (/\b(?:prev|previous|back)\b/i.test(t))
      return { name: "switch_tab", input: { direction: "previous" } }
    if (/\blast\b/i.test(t))
      return { name: "switch_tab", input: { direction: "last" } }
    if (/\b(?:next|forward)\b/i.test(t))
      return { name: "switch_tab", input: { direction: "next" } }
  }

  // Interceptor / connection agent change
  if (
    /\binterceptor\b|\bagent\b|\bproxy\b/i.test(t) &&
    /\b(?:use|switch|change|set|select)\b/i.test(t)
  ) {
    const hint = t
      .replace(/.*\b(?:to|use)\b\s*/i, "")
      .replace(/\binterceptor\b/gi, "")
      .replace(/[.!?]+$/, "")
      .replace(/^(?:the|a|an)\s+/i, "")
      .trim()
    return { name: "set_interceptor", input: { interceptor: hint } }
  }

  // Environment: add / update variables (checked before create/select so
  // "set env variable …" isn't read as selecting an environment). Requires an
  // explicit `=`/`:` assignment so questions don't match.
  if (
    !looksLikeQuestion &&
    /\benv(?:ironment)?\b/i.test(t) &&
    /\bvariables?\b|\bvars?\b/i.test(t) &&
    /\b(?:add|set|update|include|put)\b/i.test(t) &&
    /[=:]/.test(t)
  ) {
    const fragment = t.replace(/^.*?\b(?:variables?|vars?)\b\s*:?\s*/i, "")
    const variables = parsePairs(fragment)
    if (variables.length) {
      return {
        name: "add_or_update_environment_variables",
        input: { variables },
      }
    }
  }

  // Collection: create
  const createColl = looksLikeQuestion
    ? null
    : t.match(
        /\b(?:create|new|make)\b[^]*?\bcollection\b(?:\s+(?:called|named))?\s*["'`]?([\w][\w .-]*?)["'`]?\s*[.!?]*$/i
      )
  if (createColl && !isEnvStopword(createColl[1].trim())) {
    return { name: "create_collection", input: { name: createColl[1].trim() } }
  }

  // Collection: save the current request into one
  if (!looksLikeQuestion && /\bsave\b/i.test(t) && /\bcollection\b/i.test(t)) {
    const collection = t
      .replace(/.*\b(?:to|into|in)\b\s*/i, "")
      .replace(/\bcollection\b/gi, "")
      .replace(/^(?:the|an?|my)\s+/i, "")
      .replace(/["'`.!?]/g, "")
      .trim()
    if (collection) {
      return {
        name: "save_request_to_collection",
        input: { collection },
      }
    }
  }

  // Collection: open a saved request into a tab
  if (
    !looksLikeQuestion &&
    /\bopen\b/i.test(t) &&
    (/\brequest\b/i.test(t) || /\bfrom\b/i.test(t))
  ) {
    const openReq = t.match(
      /\bopen\b(?:\s+(?:the|a))?\s+(?:request\s+)?["'`]?(.+?)["'`]?(?:\s+from\s+["'`]?(.+?)["'`]?)?\s*[.!?]*$/i
    )
    const request = (openReq?.[1] ?? "").replace(/\brequest\b/gi, "").trim()
    const collection = openReq?.[2]?.replace(/\bcollection\b/gi, "").trim()
    if (request) {
      return {
        name: "open_request",
        input: { request, ...(collection ? { collection } : {}) },
      }
    }
  }

  // Environment: create
  const createEnv = looksLikeQuestion
    ? null
    : t.match(
        /\b(?:create|new|make)\b[^]*?\benv(?:ironment)?\b(?:\s+(?:called|named))?\s*["'`]?([\w][\w .-]*?)["'`]?\s*[.!?]*$/i
      )
  if (createEnv && !isEnvStopword(createEnv[1].trim())) {
    return { name: "create_environment", input: { name: createEnv[1].trim() } }
  }

  // Environment: select / switch
  if (
    !looksLikeQuestion &&
    /\benv(?:ironment)?\b/i.test(t) &&
    /\b(?:select|switch|use|change|set|activate)\b/i.test(t)
  ) {
    const selectEnv =
      t.match(
        /\b(?:select|switch|use|change|set|activate)\b[^]*?\benv(?:ironment)?\b\s+(?:to\s+)?["'`]?([\w][\w .-]*?)["'`]?\s*[.!?]*$/i
      ) ||
      t.match(
        /\b(?:select|switch|use|change|set|activate)\b[^]*?\b(?:to\s+)?(?:the\s+)?["'`]?([\w][\w .-]*?)["'`]?\s+env(?:ironment)?\b/i
      )
    const name = (selectEnv?.[1] ?? "")
      .replace(/^(?:the|an?|my)\s+/i, "")
      .trim()
    if (/\bno\b/i.test(name) || /^none$/i.test(name)) {
      return { name: "select_environment", input: { name: "none" } }
    }
    if (!isEnvStopword(name)) {
      return { name: "select_environment", input: { name } }
    }
  }

  return null
}

/** Verbs that mark the start of a distinct chat operation. */
const COMMAND_VERB =
  "open|run|send|execute|fire|save|close|duplicate|switch|create|add|set|change|update|replace|remove|delete|drop|rename|make|select|use|activate|new|go|clear"

/**
 * Splits a chained message into individual command segments, e.g.
 * "open a new tab and run the request" → ["open a new tab", "run the request"].
 * Only splits on a connector (`,` / `;` / "then" / "and") that is immediately
 * followed by a command verb, so multi-value commands such as
 * "add params a=1 and b=2" (where "b" is not a verb) are left intact.
 */
export function splitCommands(text: string): string[] {
  const splitter = new RegExp(
    `\\s*(?:,|;|\\band\\s+then\\b|\\bthen\\b|\\band\\b)\\s+(?=(?:${COMMAND_VERB})\\b)`,
    "ig"
  )
  return text
    .split(splitter)
    .map((s) => s.trim())
    .filter(Boolean)
}
