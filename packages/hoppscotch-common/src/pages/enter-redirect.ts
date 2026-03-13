export function getSafeRedirectUrl(
  rawRedirect: string,
  rootDomain: string | undefined
): URL | null {
  if (!rootDomain) return null

  // Reject backslashes to prevent WHATWG URL parser \ -> / normalization bypass
  if (rawRedirect.includes("\\")) return null

  try {
    const target = new URL("https://" + rawRedirect)

    const isAllowed =
      target.hostname.endsWith("." + rootDomain) ||
      target.hostname === rootDomain

    return isAllowed ? target : null
  } catch {
    return null
  }
}
