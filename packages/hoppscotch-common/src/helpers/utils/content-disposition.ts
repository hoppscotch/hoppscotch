import { HoppRESTResponseHeader } from "~/helpers/types/HoppRESTResponse"

export type ParsedContentDisposition = {
  type: string
  filename: string | null
}

// RFC 5987: filename*=charset'lang'percent-encoded-string
// Only UTF-8 and ISO-8859-1 are defined; everything else gets rejected.
const RFC5987_CHARSET_RE = /^(utf-8|iso-8859-1)$/i

const stripPathComponents = (name: string): string => {
  // Some servers send directory segments in the filename — RFC 6266 §4.3 says
  // receivers MUST strip them to avoid writing outside the intended target.
  const lastSlash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"))
  return lastSlash >= 0 ? name.slice(lastSlash + 1) : name
}

const decodeRfc5987 = (value: string): string | null => {
  const firstQuote = value.indexOf("'")
  const secondQuote = value.indexOf("'", firstQuote + 1)
  if (firstQuote < 0 || secondQuote < 0) return null

  const charset = value.slice(0, firstQuote)
  const encoded = value.slice(secondQuote + 1)
  if (!RFC5987_CHARSET_RE.test(charset)) return null

  // Any `%` not followed by two hex digits means the encoding is malformed.
  // The UTF-8 branch gets this check for free via `decodeURIComponent`, but
  // the ISO-8859-1 branch uses `String.prototype.replace` which would
  // silently pass bad input through, letting a broken `filename*` override
  // an otherwise-valid `filename` fallback.
  if (/%(?![0-9A-Fa-f]{2})/.test(encoded)) return null

  try {
    if (charset.toLowerCase() === "iso-8859-1") {
      // Latin-1: percent-decode bytes then map each to its Unicode codepoint
      return encoded.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
    }
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    // RFC 2616 quoted-string: a backslash escapes the next character
    return value.slice(1, -1).replace(/\\(.)/g, "$1")
  }
  return value
}

/**
 * Parses a Content-Disposition header value per RFC 6266.
 *
 * Extracts the disposition type and filename, preferring the RFC 5987
 * `filename*` parameter (which supports non-ASCII characters) over the legacy
 * `filename` parameter when both are present.
 *
 * Returns `{ type: "", filename: null }` when the header is absent or
 * unparseable rather than throwing, so callers can fall back to their default.
 */
export const parseContentDisposition = (
  header: string | null | undefined
): ParsedContentDisposition => {
  if (!header) return { type: "", filename: null }

  // Split on the first semicolon that is not inside a quoted string.
  // A naive `split(";")` breaks filenames containing a literal `;`.
  const parts: string[] = []
  let buf = ""
  let inQuotes = false
  let escape = false
  for (let i = 0; i < header.length; i++) {
    const ch = header[i]
    if (escape) {
      buf += ch
      escape = false
      continue
    }
    if (ch === "\\" && inQuotes) {
      buf += ch
      escape = true
      continue
    }
    if (ch === '"') {
      inQuotes = !inQuotes
      buf += ch
      continue
    }
    if (ch === ";" && !inQuotes) {
      parts.push(buf)
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf) parts.push(buf)

  const type = parts.shift()?.trim().toLowerCase() ?? ""

  let filename: string | null = null
  let filenameStar: string | null = null

  for (const raw of parts) {
    const eq = raw.indexOf("=")
    if (eq < 0) continue
    const key = raw.slice(0, eq).trim().toLowerCase()
    const value = raw.slice(eq + 1).trim()

    if (key === "filename*" && filenameStar === null) {
      filenameStar = decodeRfc5987(value)
    } else if (key === "filename" && filename === null) {
      filename = unquote(value)
    }
  }

  const chosen = filenameStar ?? filename
  if (!chosen) return { type, filename: null }

  const sanitized = stripPathComponents(chosen).trim()
  return { type, filename: sanitized || null }
}

/**
 * Finds the first `Content-Disposition` response header that declares a
 * filename (via `filename*` or `filename`) and returns it, or `null` if
 * no such header is present.
 *
 * Multiple `Content-Disposition` headers on the same response are unusual
 * but legal — we skip any that carry only a disposition type (e.g. bare
 * `attachment`) and keep searching, so a valid filename in a later header
 * is not silently discarded by an earlier one.
 */
export const filenameFromResponseHeaders = (
  headers: ReadonlyArray<HoppRESTResponseHeader> | undefined | null
): string | null => {
  if (!headers) return null

  for (const h of headers) {
    if (h.key.toLowerCase() === "content-disposition") {
      const filename = parseContentDisposition(h.value).filename
      if (filename !== null) return filename
    }
  }
  return null
}
