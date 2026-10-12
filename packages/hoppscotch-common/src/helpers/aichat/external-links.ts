/**
 * Schemes a chat reply link may open outside the app. Any other link, a
 * `mailto:`, a relative path or an in-page `#anchor`, is not handled here and
 * keeps the renderer's `target="_blank"`, so on desktop a click on one still
 * opens nothing, as before this handler.
 */
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:"])

/**
 * Opens a link clicked inside rendered chat markdown through `open`, the
 * platform's external link opener, and returns whether it did.
 *
 * Chat replies render links with `target="_blank"`, and the instance window
 * on desktop is built with no new-window handler, so a click there opened no
 * window. Bound on the element the markdown renders into, this finds the
 * clicked `<a>` (the click target may be a `<code>` or `<strong>` inside it),
 * cancels the webview's own navigation and calls `open` with the URL.
 */
export const openChatLinkExternally = (
  event: MouseEvent,
  open: (url: string) => unknown
): boolean => {
  if (event.defaultPrevented || event.button !== 0) return false

  const target = event.target
  if (!(target instanceof Element)) return false

  const anchor = target.closest("a[href]")
  if (!(anchor instanceof HTMLAnchorElement)) return false

  // `closest` also matches ancestors of the container, so a link wrapping
  // the whole chat panel is not this reply's link.
  const container = event.currentTarget
  if (container instanceof Node && !container.contains(anchor)) return false

  // Parsed with no base, so only an absolute URL counts. `anchor.href` would
  // resolve `#section` against the page, and on Windows the webview serves
  // the app over `http`, so the link would open in the system browser.
  let url: URL
  try {
    url = new URL(anchor.getAttribute("href") ?? "")
  } catch {
    return false
  }
  if (!EXTERNAL_PROTOCOLS.has(url.protocol)) return false

  event.preventDefault()
  open(url.href)
  return true
}
