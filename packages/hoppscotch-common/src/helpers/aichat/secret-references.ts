const LOCAL_SECRET_REFERENCE = /^<<local-ref:([A-Za-z0-9_-]+)>>$/

const SENSITIVE_ASSIGNMENT =
  /((?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret)\s*["']?\s*[:=]\s*["']?)(Bearer\s+)?([^,\s}"']+)/gi

const STANDALONE_SECRET =
  /\b(?:sk-ant-|sk-|sk_(?:test|live)_|rk_(?:test|live)_|whsec_)[A-Za-z0-9._-]+\b/gi

const REDACTED_VALUE = "[REDACTED]"

const SAFE_TEMPLATE_REFERENCE =
  /^<<(?:\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>$/

const SENSITIVE_TEMPLATE_PREFIX = /^<<(?:sk_|rk_|whsec_|sk-ant-)/i

const isSafeTemplateReference = (value: string) =>
  SAFE_TEMPLATE_REFERENCE.test(value) && !SENSITIVE_TEMPLATE_PREFIX.test(value)

export const makeLocalSecretReference = (id: string): string =>
  `<<local-ref:${id}>>`

export const getLocalSecretReferenceID = (value: string): string | null =>
  value.match(LOCAL_SECRET_REFERENCE)?.[1] ?? null

/** Removes credentials from context that has no need to retain their values. */
export const redactSensitiveChatValues = (content: string): string =>
  content
    .replace(
      SENSITIVE_ASSIGNMENT,
      (match, prefix: string, _bearer: string | undefined, secret: string) =>
        isSafeTemplateReference(secret) ? match : `${prefix}${REDACTED_VALUE}`
    )
    .replace(STANDALONE_SECRET, REDACTED_VALUE)

/**
 * Replaces user-supplied credentials with opaque, client-local references before
 * the message reaches the model. The caller owns the reference-to-value map.
 */
export const replaceSensitiveChatValues = (
  content: string,
  createReference: (secret: string) => string
): string =>
  content
    .replace(
      SENSITIVE_ASSIGNMENT,
      (match, prefix: string, bearer: string | undefined, secret: string) =>
        isSafeTemplateReference(secret)
          ? match
          : `${prefix}${bearer ?? ""}${makeLocalSecretReference(
              createReference(secret)
            )}`
    )
    .replace(STANDALONE_SECRET, (secret: string) =>
      makeLocalSecretReference(createReference(secret))
    )
