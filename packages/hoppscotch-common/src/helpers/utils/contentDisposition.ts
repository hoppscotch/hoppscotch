/**
 * Utilities for parsing the HTTP `Content-Disposition` header.
 *
 * Implemented against:
 * - RFC 6266 (Use of the Content-Disposition Header Field in HTTP)
 * - RFC 2183 (Communicating Presentation Information in Internet Messages)
 * - RFC 5987 / RFC 8187 (`filename*` extended parameter encoding)
 *
 * NOTE: RFC 2231 parameter continuations (`filename*0`, `filename*1`, ...) are
 * intentionally not supported, since RFC 6266 §4.1 explicitly excludes them
 * from the HTTP profile of the header.
 */

/**
 * Structural shape of a response header entry. Kept structural so this stays
 * usable with both `HoppRESTResponse` and `HoppRESTRequestResponse` headers.
 */
type HeaderEntry = { key: string; value: string }

/**
 * The parsed representation of a `Content-Disposition` header value.
 */
export type ParsedContentDisposition = {
  /**
   * The disposition type, lowercased (`attachment`, `inline`, ...).
   * `null` when the header carries no recognizable type.
   */
  type: string | null

  /**
   * The parameters of the header, with lowercased keys and unquoted values.
   * Extended (`filename*` style) parameters are kept in their raw, still
   * encoded form here. Use `filename` for the resolved value.
   */
  parameters: Record<string, string>

  /**
   * The resolved, sanitized filename, preferring the RFC 5987 encoded
   * `filename*` parameter over the plain `filename` parameter.
   * `null` when no usable filename could be extracted.
   */
  filename: string | null
}

/**
 * Characters that are unsafe to carry over into a filename suggestion.
 * Covers C0/C1 control characters along with path separators, which are
 * stripped separately so that only the basename survives.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/g

/**
 * `ext-value` as defined by RFC 8187 §3.2.1:
 * `charset "'" [ language ] "'" value-chars`
 */
const EXT_VALUE_REGEX =
  /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'([A-Za-z0-9\-]*)'([\s\S]*)$/

/**
 * Splits a header value on `;` while respecting quoted-strings, so that
 * separators appearing inside `filename="a;b.txt"` are not treated as
 * parameter boundaries.
 */
function splitOnUnquotedSemicolons(value: string): string[] {
  const segments: string[] = []

  let current = ""
  let inQuotes = false
  let escaped = false

  for (const char of value) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (inQuotes && char === "\\") {
      current += char
      escaped = true
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      current += char
      continue
    }

    if (char === ";" && !inQuotes) {
      segments.push(current)
      current = ""
      continue
    }

    current += char
  }

  segments.push(current)

  return segments
}

/**
 * Unwraps a `quoted-string` (RFC 9110 §5.6.4), resolving `\`-escapes.
 * Bare `token` values are returned as-is. Unterminated quotes are tolerated.
 */
function unquote(value: string): string {
  if (!value.startsWith('"')) return value

  const body =
    value.endsWith('"') && value.length > 1
      ? value.slice(1, -1)
      : value.slice(1)

  let result = ""
  let escaped = false

  for (const char of body) {
    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      continue
    }

    result += char
  }

  return result
}

/**
 * Percent-decodes an RFC 8187 `ext-value` payload for the given charset.
 * Returns `null` for unsupported charsets or malformed percent sequences, so
 * that callers can fall back to the plain `filename` parameter.
 */
function decodeExtValue(charset: string, encoded: string): string | null {
  const normalizedCharset = charset.toLowerCase()

  if (normalizedCharset === "utf-8" || normalizedCharset === "utf8") {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return null
    }
  }

  if (
    normalizedCharset === "iso-8859-1" ||
    normalizedCharset === "iso8859-1" ||
    normalizedCharset === "latin1"
  ) {
    // `String.replace` silently leaves malformed escapes (a `%` not followed by
    // two hex digits) in place, so reject them up front to match the strictness
    // `decodeURIComponent` gives us on the UTF-8 path.
    if (/%(?![0-9A-Fa-f]{2})/.test(encoded)) return null

    return encoded.replace(/%([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  }

  // RFC 8187 §3.2.1: recipients should ignore parameters using a charset
  // they do not support.
  return null
}

/**
 * Normalizes a raw filename candidate into something safe to hand to a
 * save dialog: strips any directory components, removes control characters
 * and rejects values that carry no actual name.
 */
function sanitizeFilename(value: string): string | null {
  const withoutControlChars = value.replace(CONTROL_CHARS_REGEX, "")

  // Only ever keep the basename, servers are not allowed to dictate a path
  const basename = withoutControlChars
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0)
    .pop()

  const trimmed = basename?.trim() ?? ""

  if (trimmed === "" || trimmed === "." || trimmed === "..") return null

  return trimmed
}

/**
 * Parses a `Content-Disposition` header value into its disposition type,
 * parameters and resolved filename.
 *
 * @param headerValue The raw header value (e.g. `attachment; filename="a.txt"`)
 */
export function parseContentDisposition(
  headerValue: string | null | undefined
): ParsedContentDisposition {
  const empty: ParsedContentDisposition = {
    type: null,
    parameters: {},
    filename: null,
  }

  if (typeof headerValue !== "string") return empty

  const trimmedHeader = headerValue.trim()
  if (trimmedHeader === "") return empty

  const [rawType, ...rawParams] = splitOnUnquotedSemicolons(trimmedHeader)

  const type = rawType.trim().toLowerCase() || null

  const parameters: Record<string, string> = {}

  for (const rawParam of rawParams) {
    const separatorIndex = rawParam.indexOf("=")
    if (separatorIndex === -1) continue

    const key = rawParam.slice(0, separatorIndex).trim().toLowerCase()
    if (key === "") continue

    const value = unquote(rawParam.slice(separatorIndex + 1).trim())

    // First occurrence wins, mirroring how browsers treat duplicate params
    if (!(key in parameters)) parameters[key] = value
  }

  return {
    type,
    parameters,
    filename: resolveFilename(parameters),
  }
}

/**
 * Picks the best filename out of parsed parameters, preferring the RFC 5987
 * encoded `filename*` over the plain `filename` as mandated by RFC 6266 §4.3.
 */
function resolveFilename(parameters: Record<string, string>): string | null {
  const extended = parameters["filename*"]

  if (typeof extended === "string") {
    const match = EXT_VALUE_REGEX.exec(extended.trim())

    if (match) {
      const decoded = decodeExtValue(match[1], match[3])
      if (decoded !== null) {
        const sanitized = sanitizeFilename(decoded)
        if (sanitized !== null) return sanitized
      }
    }
  }

  const plain = parameters.filename

  if (typeof plain === "string") {
    const sanitized = sanitizeFilename(plain)
    if (sanitized !== null) return sanitized
  }

  return null
}

/**
 * Convenience wrapper returning only the filename suggested by a
 * `Content-Disposition` header value.
 */
export function parseContentDispositionFilename(
  headerValue: string | null | undefined
): string | null {
  return parseContentDisposition(headerValue).filename
}

/**
 * Looks up the `Content-Disposition` header (case-insensitively) in a
 * response header list and returns the filename it suggests, if any.
 */
export function getContentDispositionFilename(
  headers: HeaderEntry[] | undefined | null
): string | null {
  if (!Array.isArray(headers)) return null

  const header = headers.find(
    (entry) =>
      typeof entry?.key === "string" &&
      entry.key.trim().toLowerCase() === "content-disposition"
  )

  if (!header) return null

  return parseContentDispositionFilename(header.value)
}

/**
 * Resolves the filename to suggest in the save dialog for a response,
 * preferring what the server asked for over the locally derived fallback.
 */
export function getSuggestedFilename(
  headers: HeaderEntry[] | undefined | null,
  fallback: string
): string {
  return getContentDispositionFilename(headers) ?? fallback
}
