/**
 * Maps the tools executed in the last completed chat turn to contextual
 * follow-up suggestions (i18n keys) shown as chips under the reply.
 *
 * Deterministic on purpose: deriving next steps from the tool names the turn
 * already produced costs no extra model round-trip and works in the offline
 * command fallback too.
 */

/**
 * Tools that edit fields of the open request. Mirrors the cases handled by
 * `applyToolCall` in `./commands`, plus the `request_edit` sentinel the
 * offline freeform parser records when a command mutated the request.
 */
const REQUEST_EDIT_TOOLS = new Set<string>([
  "set_method",
  "set_url",
  "set_body",
  "add_or_update_headers",
  "add_or_update_params",
  "add_or_update_request_variables",
  "set_bearer_auth",
  "remove_header",
  "remove_param",
  "set_prerequest_script",
  "set_test_script",
  "set_request_name",
  "set_query",
  "set_gql_variables",
  "request_edit",
])

const ENVIRONMENT_TOOLS = new Set<string>([
  "create_environment",
  "select_environment",
  "add_or_update_environment_variables",
])

const COLLECTION_EDIT_TOOLS = new Set<string>([
  "create_collection",
  "add_or_update_collection_requests",
])

const KEY_PREFIX = "ai_experiments.chat."

/**
 * Returns up to three follow-up suggestion i18n keys for a completed turn.
 * @param executedTools Names of every tool the turn executed (may be empty
 * for a prose-only answer).
 */
export function getFollowUpSuggestions(executedTools: string[]): string[] {
  const ran =
    executedTools.includes("run_request") ||
    executedTools.includes("run_collection")
  const saved =
    executedTools.includes("save_request") ||
    executedTools.includes("save_request_to_collection") ||
    executedTools.includes("add_or_update_collection_requests")
  const wroteTests =
    executedTools.includes("set_test_script") ||
    executedTools.includes("add_or_update_collection_requests")
  const edited =
    executedTools.some((t) => REQUEST_EDIT_TOOLS.has(t)) ||
    executedTools.some((t) => COLLECTION_EDIT_TOOLS.has(t))
  const openedRequest = executedTools.includes("open_request")
  const touchedEnv = executedTools.some((t) => ENVIRONMENT_TOOLS.has(t))

  const out: string[] = []

  if (ran) {
    // The run outcome lands right above these chips.
    if (!wroteTests) out.push(`${KEY_PREFIX}suggestion_write_tests`)
    out.push(`${KEY_PREFIX}suggestion_explain_response`)
  } else if (edited || openedRequest) {
    out.push(`${KEY_PREFIX}suggestion_run`)
  }

  if ((edited || ran) && !saved) out.push(`${KEY_PREFIX}suggestion_save`)
  if (openedRequest) out.push(`${KEY_PREFIX}suggestion_explain`)
  // An environment was set up but the request untouched — nudge toward
  // actually using it.
  if (touchedEnv && !edited && !ran) out.push(`${KEY_PREFIX}suggestion_use_env`)

  // Prose-only turn (a question was answered): offer generic starting points.
  if (out.length === 0) {
    out.push(
      `${KEY_PREFIX}suggestion_explain`,
      `${KEY_PREFIX}suggestion_add_header`,
      `${KEY_PREFIX}suggestion_run`
    )
  }

  return [...new Set(out)].slice(0, 3)
}
