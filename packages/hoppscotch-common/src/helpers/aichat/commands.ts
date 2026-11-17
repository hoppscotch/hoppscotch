import {
  rawKeyValueEntriesToString,
  type HoppGQLRequest,
  type HoppRESTRequest,
  type HoppRESTReqBody,
} from "@hoppscotch/data"

export interface ChatCommandResult {
  /** Whether this message was recognized as a request-editing command. */
  handled: boolean
  /** Markdown reply describing what happened. */
  reply: string
  /** Whether the request was actually mutated (used to mark the tab dirty). */
  changed?: boolean
}

export const CHAT_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

const NEED_REQUEST: ChatCommandResult = {
  handled: true,
  changed: false,
  reply: "Open a request tab first so I can edit it.",
}

const code = (s: string) => "`" + s + "`"

/** Parses a single `key: value` / `key=value` / `key value` fragment. */
function parsePair(part: string): { key: string; value: string } | null {
  let m = part.match(
    /^["'`]?([\w.-]+)["'`]?\s*(?::|=|\bto\b)\s*["'`]?(.+?)["'`]?$/i
  )
  if (!m) {
    // space-separated: `key value`
    m = part.match(/^["'`]?([\w.-]+)["'`]?\s+["'`]?(.+?)["'`]?$/)
  }
  if (!m) return null
  const key = m[1].trim()
  const value = m[2].trim()
  return key && value ? { key, value } : null
}

/** Extracts pairs from a fragment, split on comma / "and" / newline. */
export function parsePairs(
  fragment: string
): Array<{ key: string; value: string }> {
  return fragment
    .split(/\s*(?:,|\band\b|\n)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(parsePair)
    .filter((p): p is { key: string; value: string } => !!p)
}

const summarize = (
  verb: string,
  noun: string,
  pairs: Array<{ key: string; value: string }>,
  sep: string
): string =>
  `✓ ${verb} ${pairs.length === 1 ? noun : `${pairs.length} ${noun}s`}:\n` +
  pairs.map((p) => `- ${code(`${p.key}${sep}${p.value}`)}`).join("\n")

// String-bodied content types the chat can set (multipart / binary are excluded).
export const CHAT_STRING_BODY_CONTENT_TYPES = [
  "application/json",
  "application/ld+json",
  "application/hal+json",
  "application/vnd.api+json",
  "application/xml",
  "text/xml",
  "text/html",
  "text/plain",
  "application/x-www-form-urlencoded",
]
const ALLOWED_BODY_TYPES = new Set<string>(CHAT_STRING_BODY_CONTENT_TYPES)

/**
 * Sets the request body. Uses the given content type when valid, otherwise keeps
 * the current string-based content type, otherwise infers one from the content.
 */
export function applyChatBody(
  req: HoppRESTRequest,
  body: string,
  contentType?: string
): string {
  let ct = contentType && ALLOWED_BODY_TYPES.has(contentType) ? contentType : ""
  if (!ct) {
    const current = req.body
    const currentCt =
      current && "contentType" in current ? current.contentType : null
    if (currentCt && ALLOWED_BODY_TYPES.has(currentCt)) {
      ct = currentCt
    } else {
      const trimmed = body.trim()
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        ct = "application/json"
      } else if (trimmed.startsWith("<")) {
        ct = "application/xml"
      } else {
        ct = "text/plain"
      }
    }
  }
  req.body = {
    contentType: ct,
    body:
      ct === "application/x-www-form-urlencoded"
        ? toRawKeyValueLines(body)
        : body,
  } as HoppRESTReqBody
  return `✓ Set the request body (${code(ct)}).`
}

/**
 * The app stores a form-urlencoded body as raw `key: value` lines (what the
 * URL-encoded editor shows and `parseRawKeyValueEntries` reads at send time).
 * A model naturally writes the wire form `a=1&b=2`, which that parser would
 * take as ONE key — convert it, leaving already line-shaped input alone.
 */
export function toRawKeyValueLines(body: string): string {
  const trimmed = body.trim()
  const looksLikeQueryString =
    trimmed.length > 0 &&
    !trimmed.includes("\n") &&
    trimmed.includes("=") &&
    !/^[^=&]+:\s/.test(trimmed)
  if (!looksLikeQueryString) return body
  const decode = (part: string) => {
    try {
      return decodeURIComponent(part.replace(/\+/g, " "))
    } catch (_e) {
      return part
    }
  }
  // Escaped so a decoded newline or colon survives the raw parser.
  return rawKeyValueEntriesToString(
    trimmed
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=")
        const key = eq === -1 ? pair : pair.slice(0, eq)
        const value = eq === -1 ? "" : pair.slice(eq + 1)
        return { key: decode(key), value: decode(value), active: true }
      })
  )
}

/**
 * A quoted name is kept as typed. Unquoted, only the `,`/`;` splitCommands
 * leaves before "then run it" is dropped: "What's new?" keeps its "?".
 */
const requestName = (raw: string) => {
  const quoted = raw.match(/^(["'`])(.+)\1\s*[.!?,;]*$/)
  if (quoted) return quoted[2].trim()
  return raw
    .replace(/\s*[,;]+$/, "")
    .replace(/^["'`]|["'`]$/g, "")
    .trim()
}

/**
 * Interprets a chat message as a request-editing command and applies it to
 * `req` (mutating it in place). This is the local stand-in for LLM tool use —
 * the same edits will later be driven by the model via tool calls.
 *
 * @returns `handled: false` when the message isn't a recognized command (so the
 * caller can fall back to a normal chat reply).
 */
export function runChatCommand(
  req: HoppRESTRequest | null,
  text: string
): ChatCommandResult {
  const t = text.trim()

  // Help / capabilities
  if (/^(?:help|what can you do|commands?)\b/i.test(t)) {
    return {
      handled: true,
      reply:
        "I can edit the current request. Try:\n" +
        "- add header `Authorization: Bearer <token>`\n" +
        "- add param `page=1, limit=20`\n" +
        "- add variable `userId=123`\n" +
        "- set method to `POST`\n" +
        "- set url to `https://api.example.com/users`\n" +
        "- set bearer token `<token>`\n" +
        "- set pre-request script to `<code>`\n" +
        "- set test script to `<code>`\n" +
        "- rename the request to `<name>`\n" +
        "- remove header `Authorization`\n\n" +
        "Tip: reference environment variables anywhere with `<<variableName>>` " +
        "(e.g. `<<baseUrl>>/users`), and dynamic values like `<<$guid>>` or " +
        "`<<$timestamp>>`.",
    }
  }

  // Pre-request script (checked before method/body so script contents that
  // mention "request"/"body"/an HTTP verb aren't misinterpreted)
  let m = t.match(
    /\b(?:set|add|update|replace)\b.*?\bpre-?request\b.*?\bscript\b\s*(?:to|=|:)?\s*([\s\S]+)$/i
  )
  if (m) {
    if (!req) return NEED_REQUEST
    req.preRequestScript = m[1].trim().replace(/^["'`]+|["'`]+$/g, "")
    return {
      handled: true,
      changed: true,
      reply: "✓ Updated the pre-request script.",
    }
  }

  // Test / post-request script
  m = t.match(
    /\b(?:set|add|update|replace)\b.*?\b(?:test|post-?request)\b.*?\bscript\b\s*(?:to|=|:)?\s*([\s\S]+)$/i
  )
  if (m) {
    if (!req) return NEED_REQUEST
    req.testScript = m[1].trim().replace(/^["'`]+|["'`]+$/g, "")
    return {
      handled: true,
      changed: true,
      reply: "✓ Updated the test script.",
    }
  }

  // Rename request: only the request itself, or a bare "rename to …"
  m =
    t.match(
      /\brename\s+(?:(?:the|this|my|current)\s+)*(?:(?:request|tab|it)\s+)?(?:to|as)\s+(.+?)\s*$/i
    ) ??
    t.match(
      /\b(?:set|change|update)\s+(?:(?:the|this|my|current)\s+)*(?:(?:request|tab)(?:'s)?\s+)?name(?:\s+of\s+(?:(?:the|this|my|current)\s+)*(?:request|tab|it))?\s*(?:to|as|=|:)\s*(.+?)\s*$/i
    )
  if (m) {
    if (!req) return NEED_REQUEST
    const reqName = requestName(m[1])
    if (reqName) {
      req.name = reqName
      return {
        handled: true,
        changed: true,
        reply: `✓ Renamed the request to ${code(reqName)}.`,
      }
    }
  }
  // Renaming a header, collection… isn't an offline edit.
  if (/^(?:rename|(?:set|change|update)\s+(?:the\s+)?name\s+of)\b/i.test(t)) {
    return { handled: false, reply: "" }
  }

  // Remove header
  m = t.match(/\b(?:remove|delete|drop)\b.*?\bheader\b\s+["'`]?([\w.-]+)/i)
  if (m) {
    if (!req) return NEED_REQUEST
    const key = m[1]
    const before = req.headers.length
    req.headers = req.headers.filter(
      (h) => h.key.toLowerCase() !== key.toLowerCase()
    )
    const removed = before !== req.headers.length
    return {
      handled: true,
      changed: removed,
      reply: removed
        ? `✓ Removed header ${code(key)}.`
        : `I couldn't find a header named ${code(key)}.`,
    }
  }

  // Remove param
  m = t.match(
    /\b(?:remove|delete|drop)\b.*?\bparam(?:eter)?\b\s+["'`]?([\w.-]+)/i
  )
  if (m) {
    if (!req) return NEED_REQUEST
    const key = m[1]
    const before = req.params.length
    req.params = req.params.filter(
      (p) => p.key.toLowerCase() !== key.toLowerCase()
    )
    const removed = before !== req.params.length
    return {
      handled: true,
      changed: removed,
      reply: removed
        ? `✓ Removed query param ${code(key)}.`
        : `I couldn't find a query param named ${code(key)}.`,
    }
  }

  // Method: names "method", or "make the request a POST" / "switch to GET"
  if (
    /\b(?:set|change|switch|make|use)\b/i.test(t) &&
    !/\b(?:url|endpoint|address|body|headers?|param(?:eter)?s?|variables?)\b/i.test(
      t
    )
  ) {
    const verbs = CHAT_HTTP_METHODS.join("|")
    const mm =
      t.match(new RegExp(`\\bmethod\\b[^]*?\\b(${verbs})\\b`, "i")) ??
      t.match(new RegExp(`\\b(${verbs})\\b[^]*?\\bmethod\\b`, "i")) ??
      t.match(
        new RegExp(
          `\\b(?:set|change|switch|make|use)\\s+(?:(?:(?:the|this)\\s+)?request\\s+|it\\s+|this\\s+)?(?:(?:to|as|into)\\s+)?(?:an?\\s+)?(${verbs})(?:\\s+(?:for\\s+(?:the\\s+|this\\s+)?)?request)?\\s*[.!]*$`,
          "i"
        )
      )
    if (mm) {
      if (!req) return NEED_REQUEST
      const method = mm[1].toUpperCase()
      const changed = req.method !== method
      req.method = method
      return {
        handled: true,
        changed,
        reply: `✓ Set the method to ${code(method)}.`,
      }
    }
  }

  // URL / endpoint
  m = t.match(
    /\b(?:set|change|update|use)\b.*?\b(?:url|endpoint|address)\b\s*(?:to\s+)?["'`]?(\S+?)["'`]?$/i
  )
  if (m) {
    if (!req) return NEED_REQUEST
    req.endpoint = m[1]
    return {
      handled: true,
      changed: true,
      reply: `✓ Set the URL to ${code(m[1])}.`,
    }
  }

  // Headers
  if (/\bheaders?\b/i.test(t) && /\b(?:add|set|include|put)\b/i.test(t)) {
    const pairs = parsePairs(t.replace(/^.*?\bheaders?\b\s*:?\s*/i, ""))
    if (pairs.length) {
      if (!req) return NEED_REQUEST
      let changed = false
      for (const { key, value } of pairs) {
        const existing = req.headers.find(
          (h) => h.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          if (existing.value !== value || !existing.active) changed = true
          existing.value = value
          existing.active = true
        } else {
          req.headers.push({ key, value, active: true, description: "" })
          changed = true
        }
      }
      return {
        handled: true,
        changed,
        reply: summarize(changed ? "Added" : "Kept", "header", pairs, ": "),
      }
    }
  }

  // Query params
  if (
    /\bparam(?:eter)?s?\b/i.test(t) &&
    /\b(?:add|set|include|put)\b/i.test(t)
  ) {
    const pairs = parsePairs(t.replace(/^.*?\bparam(?:eter)?s?\b\s*:?\s*/i, ""))
    if (pairs.length) {
      if (!req) return NEED_REQUEST
      let changed = false
      for (const { key, value } of pairs) {
        const existing = req.params.find(
          (p) => p.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          if (existing.value !== value || !existing.active) changed = true
          existing.value = value
          existing.active = true
        } else {
          req.params.push({ key, value, active: true, description: "" })
          changed = true
        }
      }
      return {
        handled: true,
        changed,
        reply: summarize(changed ? "Added" : "Kept", "query param", pairs, "="),
      }
    }
  }

  // Request variables
  if (/\bvariables?\b/i.test(t) && /\b(?:add|set|include)\b/i.test(t)) {
    const pairs = parsePairs(t.replace(/^.*?\bvariables?\b\s*:?\s*/i, ""))
    if (pairs.length) {
      if (!req) return NEED_REQUEST
      let changed = false
      for (const { key, value } of pairs) {
        const existing = req.requestVariables.find(
          (v) => v.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          if (existing.value !== value || !existing.active) changed = true
          existing.value = value
          existing.active = true
        } else {
          req.requestVariables.push({ key, value, active: true })
          changed = true
        }
      }
      return {
        handled: true,
        changed,
        reply: summarize(
          changed ? "Added" : "Kept",
          "request variable",
          pairs,
          "="
        ),
      }
    }
  }

  // Body (kept after headers/params so "body" in a header key isn't captured)
  m = t.match(
    /\b(?:set|update|change|replace|add)\b.*?\bbody\b\s*(?:to|=|:)?\s*([\s\S]+)$/i
  )
  if (m) {
    if (!req) return NEED_REQUEST
    const body = m[1].trim().replace(/^["'`]+|["'`]+$/g, "")
    if (!body) {
      return {
        handled: true,
        changed: false,
        reply: "What should the body be?",
      }
    }
    return { handled: true, changed: true, reply: applyChatBody(req, body) }
  }

  // Bearer token / auth (fallback for auth phrasing)
  if (/\bbearer\b|\btoken\b|\bauthorization\b/i.test(t)) {
    m = t.match(
      /(?:bearer(?:\s+token)?|token|authorization)\s*(?:to|=|:)?\s*["'`]?([A-Za-z0-9._-]{4,})["'`]?\s*$/i
    )
    if (m) {
      if (!req) return NEED_REQUEST
      req.auth = { authActive: true, authType: "bearer", token: m[1] }
      return {
        handled: true,
        changed: true,
        reply: "✓ Set Bearer token authentication.",
      }
    }
  }

  return { handled: false, reply: "" }
}

const NO_SCRIPT_REPLY =
  "No script was provided — pass the full script text (an empty string clears it)."

/** Coerces an LLM tool-call array argument into `{ key, value }` pairs. */
function toPairs(value: unknown): Array<{ key: string; value: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => {
      if (v && typeof v === "object" && "key" in v) {
        const key = String((v as Record<string, unknown>).key ?? "").trim()
        const val = String((v as Record<string, unknown>).value ?? "").trim()
        return key ? { key, value: val } : null
      }
      return null
    })
    .filter((p): p is { key: string; value: string } => !!p)
}

/**
 * Applies a structured tool call (from the LLM) to the request. The tool names
 * and input shapes mirror the tool schemas defined in the backend chat service.
 * This is the same action layer the regex fallback uses, just keyed by tool name
 * instead of parsed from free text.
 */
export function applyToolCall(
  req: HoppRESTRequest | null,
  name: string,
  input: Record<string, unknown> | null | undefined
): ChatCommandResult {
  if (!req) return NEED_REQUEST
  const args = (input ?? {}) as Record<string, unknown>

  switch (name) {
    case "add_or_update_headers": {
      const pairs = toPairs(args.headers)
      if (!pairs.length) {
        return {
          handled: true,
          changed: false,
          reply: "No headers were provided.",
        }
      }
      for (const { key, value } of pairs) {
        const existing = req.headers.find(
          (h) => h.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          existing.value = value
          existing.active = true
        } else {
          req.headers.push({ key, value, active: true, description: "" })
        }
      }
      return {
        handled: true,
        changed: true,
        reply: summarize("Added", "header", pairs, ": "),
      }
    }

    case "add_or_update_params": {
      const pairs = toPairs(args.params)
      if (!pairs.length) {
        return {
          handled: true,
          changed: false,
          reply: "No params were provided.",
        }
      }
      for (const { key, value } of pairs) {
        const existing = req.params.find(
          (p) => p.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          existing.value = value
          existing.active = true
        } else {
          req.params.push({ key, value, active: true, description: "" })
        }
      }
      return {
        handled: true,
        changed: true,
        reply: summarize("Added", "query param", pairs, "="),
      }
    }

    case "add_or_update_request_variables": {
      const pairs = toPairs(args.variables)
      if (!pairs.length) {
        return {
          handled: true,
          changed: false,
          reply: "No variables were provided.",
        }
      }
      for (const { key, value } of pairs) {
        const existing = req.requestVariables.find(
          (v) => v.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          existing.value = value
          existing.active = true
        } else {
          req.requestVariables.push({ key, value, active: true })
        }
      }
      return {
        handled: true,
        changed: true,
        reply: summarize("Added", "request variable", pairs, "="),
      }
    }

    case "set_method": {
      const method = String(args.method ?? "")
        .trim()
        .toUpperCase()
      if (!method)
        return {
          handled: true,
          changed: false,
          reply: "No method was provided.",
        }
      if (!CHAT_HTTP_METHODS.includes(method))
        return {
          handled: true,
          changed: false,
          reply: `Unsupported method ${code(method)}. Use one of: ${CHAT_HTTP_METHODS.join(", ")}.`,
        }
      const changed = req.method !== method
      req.method = method
      return {
        handled: true,
        changed,
        reply: `✓ Set the method to ${code(method)}.`,
      }
    }

    case "set_url": {
      const url = String(args.url ?? "").trim()
      if (!url)
        return { handled: true, changed: false, reply: "No URL was provided." }
      req.endpoint = url
      return {
        handled: true,
        changed: true,
        reply: `✓ Set the URL to ${code(url)}.`,
      }
    }

    case "set_bearer_auth": {
      const token = String(args.token ?? "").trim()
      if (!token)
        return {
          handled: true,
          changed: false,
          reply: "No token was provided.",
        }
      req.auth = { authActive: true, authType: "bearer", token }
      return {
        handled: true,
        changed: true,
        reply: "✓ Set Bearer token authentication.",
      }
    }

    case "remove_header": {
      const key = String(args.key ?? "").trim()
      const before = req.headers.length
      req.headers = req.headers.filter(
        (h) => h.key.toLowerCase() !== key.toLowerCase()
      )
      const removed = before !== req.headers.length
      return {
        handled: true,
        changed: removed,
        reply: removed
          ? `✓ Removed header ${code(key)}.`
          : `I couldn't find a header named ${code(key)}.`,
      }
    }

    case "remove_param": {
      const key = String(args.key ?? "").trim()
      const before = req.params.length
      req.params = req.params.filter(
        (p) => p.key.toLowerCase() !== key.toLowerCase()
      )
      const removed = before !== req.params.length
      return {
        handled: true,
        changed: removed,
        reply: removed
          ? `✓ Removed query param ${code(key)}.`
          : `I couldn't find a query param named ${code(key)}.`,
      }
    }

    case "set_body": {
      const contentType = args.contentType
        ? String(args.contentType)
        : undefined
      const body = args.body
      if (body === undefined || body === null) {
        if (!contentType) {
          return {
            handled: true,
            changed: false,
            reply: "No body was provided.",
          }
        }
        // Only the content type changes — keep whatever string body exists.
        const current =
          req.body && "body" in req.body && typeof req.body.body === "string"
            ? req.body.body
            : ""
        return {
          handled: true,
          changed: true,
          reply: applyChatBody(req, current, contentType),
        }
      }
      if (typeof body === "string") {
        return {
          handled: true,
          changed: true,
          reply: applyChatBody(req, body, contentType),
        }
      }
      // Weaker models send a JSON body as an object: serialize it as JSON.
      const type =
        contentType && ALLOWED_BODY_TYPES.has(contentType) ? contentType : null
      if (type && !/json/i.test(type)) {
        return {
          handled: true,
          changed: false,
          reply: `⚠️ A ${code(type)} body must be text — nothing changed.`,
        }
      }
      // Keep a JSON variant (vnd.api+json…) the request already uses.
      const current =
        req.body && "contentType" in req.body ? req.body.contentType : null
      const currentJSON =
        current && ALLOWED_BODY_TYPES.has(current) && /json/i.test(current)
          ? current
          : null
      return {
        handled: true,
        changed: true,
        reply: applyChatBody(
          req,
          JSON.stringify(body, null, 2),
          type ?? currentJSON ?? "application/json"
        ),
      }
    }

    case "set_prerequest_script": {
      if (typeof args.script !== "string")
        return { handled: true, changed: false, reply: NO_SCRIPT_REPLY }
      const script = args.script
      req.preRequestScript = script
      return {
        handled: true,
        changed: true,
        reply: script
          ? "✓ Updated the pre-request script."
          : "✓ Cleared the pre-request script.",
      }
    }

    case "set_test_script": {
      if (typeof args.script !== "string")
        return { handled: true, changed: false, reply: NO_SCRIPT_REPLY }
      const script = args.script
      req.testScript = script
      return {
        handled: true,
        changed: true,
        reply: script
          ? "✓ Updated the test (post-request) script."
          : "✓ Cleared the test script.",
      }
    }

    case "set_request_name": {
      const reqName = String(args.name ?? "").trim()
      if (!reqName)
        return { handled: true, changed: false, reply: "No name was provided." }
      req.name = reqName
      return {
        handled: true,
        changed: true,
        reply: `✓ Renamed the request to ${code(reqName)}.`,
      }
    }

    case "set_query":
    case "set_gql_variables":
      return {
        handled: true,
        changed: false,
        reply:
          "That edit applies to GraphQL request tabs — this is a REST request tab.",
      }

    default:
      return { handled: false, reply: "" }
  }
}

/** Request-edit tools that only make sense for REST requests. */
const REST_ONLY_EDIT_TOOLS = new Set<string>([
  "set_method",
  "set_body",
  "add_or_update_params",
  "remove_param",
  "add_or_update_request_variables",
])

/**
 * Applies a structured tool call to a GraphQL request (a `gql-request` tab in
 * the unified workspace). Shares the tool-name contract with `applyToolCall` —
 * the fields both request types have (URL, headers, auth, name, scripts) use
 * the same tools, while `set_query` / `set_gql_variables` are GQL-specific and
 * the REST-only tools reply with a graceful refusal.
 */
export function applyGQLToolCall(
  req: HoppGQLRequest | null,
  name: string,
  input: Record<string, unknown> | null | undefined
): ChatCommandResult {
  if (!req) return NEED_REQUEST
  const args = (input ?? {}) as Record<string, unknown>

  switch (name) {
    case "set_url": {
      const url = String(args.url ?? "").trim()
      if (!url)
        return { handled: true, changed: false, reply: "No URL was provided." }
      req.url = url
      return {
        handled: true,
        changed: true,
        reply: `✓ Set the URL to ${code(url)}.`,
      }
    }

    case "add_or_update_headers": {
      const pairs = toPairs(args.headers)
      if (!pairs.length) {
        return {
          handled: true,
          changed: false,
          reply: "No headers were provided.",
        }
      }
      for (const { key, value } of pairs) {
        const existing = req.headers.find(
          (h) => h.key.toLowerCase() === key.toLowerCase()
        )
        if (existing) {
          existing.value = value
          existing.active = true
        } else {
          req.headers.push({ key, value, active: true, description: "" })
        }
      }
      return {
        handled: true,
        changed: true,
        reply: summarize("Added", "header", pairs, ": "),
      }
    }

    case "remove_header": {
      const key = String(args.key ?? "").trim()
      const before = req.headers.length
      req.headers = req.headers.filter(
        (h) => h.key.toLowerCase() !== key.toLowerCase()
      )
      const removed = before !== req.headers.length
      return {
        handled: true,
        changed: removed,
        reply: removed
          ? `✓ Removed header ${code(key)}.`
          : `I couldn't find a header named ${code(key)}.`,
      }
    }

    case "set_bearer_auth": {
      const token = String(args.token ?? "").trim()
      if (!token)
        return {
          handled: true,
          changed: false,
          reply: "No token was provided.",
        }
      req.auth = { authActive: true, authType: "bearer", token }
      return {
        handled: true,
        changed: true,
        reply: "✓ Set Bearer token authentication.",
      }
    }

    case "set_request_name": {
      const reqName = String(args.name ?? "").trim()
      if (!reqName)
        return { handled: true, changed: false, reply: "No name was provided." }
      req.name = reqName
      return {
        handled: true,
        changed: true,
        reply: `✓ Renamed the request to ${code(reqName)}.`,
      }
    }

    case "set_prerequest_script": {
      if (typeof args.script !== "string")
        return { handled: true, changed: false, reply: NO_SCRIPT_REPLY }
      const script = args.script
      req.preRequestScript = script
      return {
        handled: true,
        changed: true,
        reply: script
          ? "✓ Updated the pre-request script."
          : "✓ Cleared the pre-request script.",
      }
    }

    case "set_test_script": {
      if (typeof args.script !== "string")
        return { handled: true, changed: false, reply: NO_SCRIPT_REPLY }
      const script = args.script
      req.testScript = script
      return {
        handled: true,
        changed: true,
        reply: script
          ? "✓ Updated the test (post-request) script."
          : "✓ Cleared the test script.",
      }
    }

    case "set_query": {
      if (typeof args.query !== "string")
        return {
          handled: true,
          changed: false,
          reply:
            "No query was provided — pass the full query text (an empty string clears it).",
        }
      const query = args.query
      req.query = query
      return {
        handled: true,
        changed: true,
        reply: query
          ? "✓ Updated the GraphQL query."
          : "✓ Cleared the GraphQL query.",
      }
    }

    case "set_gql_variables": {
      if (typeof args.variables !== "string")
        return {
          handled: true,
          changed: false,
          reply:
            "No variables were provided — pass the variables JSON as a string (an empty string clears them).",
        }
      const variables = args.variables
      req.variables = variables
      return {
        handled: true,
        changed: true,
        reply: variables
          ? "✓ Updated the query variables."
          : "✓ Cleared the query variables.",
      }
    }

    default:
      if (REST_ONLY_EDIT_TOOLS.has(name)) {
        return {
          handled: true,
          changed: false,
          reply:
            "That edit applies to REST request tabs only — this is a GraphQL request tab.",
        }
      }
      return { handled: false, reply: "" }
  }
}
