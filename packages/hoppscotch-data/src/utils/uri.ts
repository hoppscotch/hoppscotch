/**
 * URI/URL validation and parsing utilities for Hoppscotch request handling.
 */

/**
 * Result type for URL parsing operations
 */
export interface ParsedURL {
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  origin: string
}

/**
 * Attempts to parse a URL string, returning null if invalid.
 * Handles edge cases like missing protocol by prepending https://.
 *
 * @param url - The URL string to parse
 * @param defaultProtocol - Protocol to prepend if missing (default: "https://")
 * @returns ParsedURL object or null if parsing fails
 */
export function safeParseURL(
  url: string,
  defaultProtocol: string = "https://"
): ParsedURL | null {
  if (!url || typeof url !== "string") {
    return null
  }

  const trimmedUrl = url.trim()
  if (trimmedUrl === "") {
    return null
  }

  // Try parsing as-is first
  try {
    const parsed = new URL(trimmedUrl)
    return extractURLComponents(parsed)
  } catch {
    // If parsing fails, try with default protocol
  }

  // Try with default protocol prepended
  try {
    const parsed = new URL(`${defaultProtocol}${trimmedUrl}`)
    return extractURLComponents(parsed)
  } catch {
    return null
  }
}

function extractURLComponents(parsed: URL): ParsedURL {
  return {
    protocol: parsed.protocol,
    host: parsed.host,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    origin: parsed.origin,
  }
}

/**
 * Checks whether a string is a syntactically valid URL.
 *
 * @param url - The string to validate
 * @returns true if the string can be parsed as a URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts query parameters from a URL string as key-value pairs.
 *
 * @param url - A valid URL string
 * @returns Array of { key, value } pairs, or empty array if URL is invalid
 */
export function extractQueryParams(
  url: string
): Array<{ key: string; value: string }> {
  try {
    const parsed = new URL(url)
    const params: Array<{ key: string; value: string }> = []

    parsed.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })

    return params
  } catch {
    return []
  }
}

/**
 * Builds a URL string from a base URL and an array of query parameters.
 * Existing query parameters in the base URL are preserved.
 *
 * @param baseUrl - The base URL (may already contain query params)
 * @param params - Additional query parameters to append
 * @returns The constructed URL string, or the original baseUrl if parsing fails
 */
export function buildURLWithParams(
  baseUrl: string,
  params: Array<{ key: string; value: string; active?: boolean }>
): string {
  try {
    const parsed = new URL(baseUrl)

    for (const param of params) {
      if (param.active !== false && param.key.trim() !== "") {
        parsed.searchParams.append(param.key, param.value)
      }
    }

    return parsed.toString()
  } catch {
    return baseUrl
  }
}

/**
 * Joins a base URL with a relative path, handling trailing/leading slashes.
 *
 * @param base - The base URL
 * @param path - The relative path to join
 * @returns The joined URL string
 */
export function joinURLPath(base: string, path: string): string {
  if (!base) return path
  if (!path) return base

  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base
  const cleanPath = path.startsWith("/") ? path : `/${path}`

  return `${cleanBase}${cleanPath}`
}
