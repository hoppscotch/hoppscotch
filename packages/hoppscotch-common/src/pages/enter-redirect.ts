export function getSafeRedirectUrl(
  rawRedirect: string,
  rootDomain: string | undefined
): URL | null {
  if (!rootDomain) return null

  // Reject characters the WHATWG URL parser normalizes or strips silently:
  // backslash (\ -> /), tab, newline, carriage-return
  if (/[\\\t\r\n]/.test(rawRedirect)) return null

  try {
    const target = new URL("https://" + rawRedirect)

    if (target.username || target.password) return null

    const isAllowed =
      target.hostname.endsWith("." + rootDomain) ||
      target.hostname === rootDomain

    return isAllowed ? target : null
  } catch {
    return null
  }
}
