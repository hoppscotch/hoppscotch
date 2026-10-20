/**
 * Extract initials from organization name (1-2 characters)
 * Trims whitespace and handles edge cases like special characters
 */
export const getOrgInitials = (name: string): string => {
  const trimmedName = name.trim()

  // Return "?" for empty or whitespace-only strings
  if (!trimmedName) return "?"

  const initials = trimmedName
    .split(" ")
    .filter((word) => word !== "")
    .map((word) => word[0])
    .filter((char) => char !== undefined)
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return initials || "?"
}

/**
 * Generate deterministic color index from organization name hash
 */
export const getOrgColorIndex = (orgName: string): number => {
  const normalized = orgName.toLowerCase().trim()
  let hash = normalized.length
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash = hash | 0
  }
  return Math.abs(hash)
}

export const ORG_AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-green-500 text-white",
  "bg-purple-500 text-white",
  "bg-pink-500 text-white",
  "bg-orange-500 text-white",
  "bg-teal-500 text-white",
  "bg-indigo-500 text-white",
  "bg-red-500 text-white",
  "bg-yellow-500 text-gray-900",
  "bg-cyan-500 text-white",
]

/**
 * Get deterministic color for organization avatar
 */
export const getOrgColor = (orgName: string): string => {
  const index = getOrgColorIndex(orgName)
  return ORG_AVATAR_COLORS[index % ORG_AVATAR_COLORS.length]
}

/**
 * Sanitize URL to prevent XSS attacks
 * Only allows http/https/data/blob protocols
 * @param url - The URL to sanitize
 * @returns The sanitized URL or empty string if invalid
 */
export const sanitizeLogoUrl = (url: string | null | undefined): string => {
  if (!url) return ""

  // Browsers ignore control characters (tabs, newlines, etc.) while parsing
  // URLs, so a disguised scheme like `java\tscript:` collapses to
  // `javascript:` in the DOM. Strip C0 controls (U+0000-U+001F), DEL (U+007F)
  // and C1 controls (U+0080-U+009F) before validating so the protocol checks
  // below can't be bypassed.
  const trimmed = Array.from(url)
    .filter((char) => {
      const code = char.charCodeAt(0)
      // Keep everything except C0 (U+0000-U+001F), DEL (U+007F),
      // and C1 (U+0080-U+009F) control characters.
      return code > 0x1f && code !== 0x7f && !(code >= 0x80 && code <= 0x9f)
    })
    .join("")
    .trim()
  if (!trimmed) return ""

  // Allow data URLs for file previews
  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  // Allow blob URLs for local file objects
  if (trimmed.startsWith("blob:")) {
    return trimmed
  }

  // Extract protocol from URL
  const match = trimmed.match(/^([a-z0-9+.-]+):/i)
  if (!match) {
    // No protocol, assume relative URL is safe
    return trimmed
  }

  const protocol = match[1].toLowerCase()

  // Only allow safe protocols
  if (protocol === "http" || protocol === "https") {
    return trimmed
  }

  // Reject dangerous protocols like javascript:, vbscript:, etc.
  console.warn(`Blocked potentially unsafe logo URL protocol: ${protocol}`)
  return ""
}
