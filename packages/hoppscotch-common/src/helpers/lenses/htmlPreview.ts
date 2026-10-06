/**
 * Builds the srcdoc for the HTML response preview iframe.
 *
 * Dark / black app themes set `color-scheme: dark` on `:root`, which srcdoc
 * iframes inherit. Unstyled HTML then uses light canvas text on a light
 * iframe background, so the preview looks blank until the text is selected.
 * Forcing a light color-scheme restores the usual browser defaults without
 * overriding a response that already declares its own color-scheme.
 */
export function buildHtmlPreviewSrcdoc(
  html: string,
  baseHref = ""
): string {
  const previewDocument = new DOMParser().parseFromString(html, "text/html")

  const base = previewDocument.createElement("base")
  base.setAttribute("href", baseHref)
  previewDocument.head.prepend(base)

  if (!hasColorSchemeMeta(previewDocument)) {
    const meta = previewDocument.createElement("meta")
    meta.setAttribute("name", "color-scheme")
    meta.setAttribute("content", "light")
    previewDocument.head.prepend(meta)
  }

  return previewDocument.documentElement.outerHTML
}

function hasColorSchemeMeta(doc: Document): boolean {
  return Array.from(doc.querySelectorAll("meta")).some(
    (el) => el.getAttribute("name")?.trim().toLowerCase() === "color-scheme"
  )
}
