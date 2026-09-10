const LOCAL_SECRET_REFERENCE = /^<<local-ref:([A-Za-z0-9_-]+)>>$/
/** Every `<<local-ref:id>>` occurrence inside a longer string. */
export const LOCAL_SECRET_REFERENCE_GLOBAL = /<<local-ref:([A-Za-z0-9_-]+)>>/g

const REDACTED_VALUE = "[REDACTED]"

/**
 * Values that may stay visible: environment placeholders (<<name>>, <<$fn>>)
 * and existing client-local references (<<local-ref:id>>) — both are opaque
 * to the model. Mirrors the backend sanitizer in ai-experiments.service.ts.
 */
const SAFE_VALUE_PREFIX =
  /^<<(?:local-ref:[A-Za-z0-9_-]+|\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>/
const SENSITIVE_TEMPLATE_PREFIX = /^<<(?:sk_|rk_|whsec_|sk-ant-)/i
/** JSON/YAML literals that follow a keyword used as a FIELD NAME, not a value. */
const STRUCTURAL_LITERAL = /^(?:true|false|null|\d+(?:\.\d+)?|[[{])/
/** GraphQL SDL type references after a field/argument name (`password: String!`). */
const TYPE_REFERENCE = /^\[?[A-Z][A-Za-z0-9_]*!?\]?!?$/

const isSafeValue = (value: string) =>
  SAFE_VALUE_PREFIX.test(value) && !SENSITIVE_TEMPLATE_PREFIX.test(value)

// Whitespace runs are bounded on purpose: an unbounded `\s*["']?\s*` pair
// backtracks quadratically on a keyword followed by a long whitespace run.
const KEY_SEP = `[ \\t]{0,8}["']?[ \\t]{0,8}[:=][ \\t]{0,8}["']?`

/** `Authorization: <scheme> <credential>` — the scheme stays, the credential goes. */
const AUTH_HEADER_ASSIGNMENT = new RegExp(
  `((?:authorization|proxy-authorization)${KEY_SEP})((?:Bearer|Basic|Token|Negotiate|NTLM|OAuth)[ \\t]+)?((?:Digest|AWS4-HMAC-SHA256|Signature)[ \\t]+[^\\r\\n"'}]+|[^\\s,}"']+)`,
  "gi"
)
/** Cookie headers carry several `k=v` pairs — treat the whole value as one secret. */
const COOKIE_ASSIGNMENT = new RegExp(
  `((?:cookie|set-cookie)${KEY_SEP})([^\\r\\n"'}]+)`,
  "gi"
)
/** Single-token credential assignments (`api_key=…`, `"password": "…"`). */
const SENSITIVE_ASSIGNMENT = new RegExp(
  `((?:x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|client[-_]?secret|password|secret)${KEY_SEP})([^,\\s}"']+)`,
  "gi"
)
/** Bare credentials with a recognizable shape, wherever they appear. */
const STANDALONE_SECRET =
  /\b(?:sk-ant-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|sk_(?:test|live)_[A-Za-z0-9]+|rk_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})/g

export const makeLocalSecretReference = (id: string): string =>
  `<<local-ref:${id}>>`

export const getLocalSecretReferenceID = (value: string): string | null =>
  value.match(LOCAL_SECRET_REFERENCE)?.[1] ?? null

/** True when the string contains a `<<local-ref:id>>` anywhere. */
export const containsLocalSecretReference = (value: string): boolean => {
  LOCAL_SECRET_REFERENCE_GLOBAL.lastIndex = 0
  return LOCAL_SECRET_REFERENCE_GLOBAL.test(value)
}

/**
 * Rewrites every credential in `content` through `onSecret` (which returns
 * the replacement text). Values that are already opaque to the model —
 * environment placeholders and local references — are left untouched, as are
 * JSON literals that merely follow a keyword used as a field name.
 */
const rewriteSensitiveValues = (
  content: string,
  onSecret: (secret: string) => string
): string =>
  content
    .replace(
      AUTH_HEADER_ASSIGNMENT,
      (match, prefix: string, scheme: string | undefined, secret: string) =>
        isSafeValue(secret)
          ? match
          : `${prefix}${scheme ?? ""}${onSecret(secret.trim())}`
    )
    .replace(COOKIE_ASSIGNMENT, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ? match : `${prefix}${onSecret(secret.trim())}`
    )
    .replace(SENSITIVE_ASSIGNMENT, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ||
      STRUCTURAL_LITERAL.test(secret) ||
      TYPE_REFERENCE.test(secret)
        ? match
        : `${prefix}${onSecret(secret)}`
    )
    .replace(STANDALONE_SECRET, (secret: string) => onSecret(secret))

/** Removes credentials from context that has no need to retain their values. */
export const redactSensitiveChatValues = (content: string): string =>
  rewriteSensitiveValues(content, () => REDACTED_VALUE)

/**
 * Replaces user-supplied credentials with opaque, client-local references before
 * the message reaches the model. The caller owns the reference-to-value map.
 */
export const replaceSensitiveChatValues = (
  content: string,
  createReference: (secret: string) => string
): string =>
  rewriteSensitiveValues(content, (secret) =>
    makeLocalSecretReference(createReference(secret))
  )
