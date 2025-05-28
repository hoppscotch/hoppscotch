import { HoppRESTResponse } from "../types/HoppRESTResponse"
import jsonLens, { isValidJSONResponse } from "./jsonLens"
import rawLens from "./rawLens"
import imageLens from "./imageLens"
import htmlLens from "./htmlLens"
import xmlLens from "./xmlLens"
import pdfLens from "./pdfLens"
import audioLens from "./audioLens"
import videoLens from "./videoLens"
import { defineAsyncComponent } from "vue"

export type Lens = {
  lensName: string
  isSupportedContentType: (contentType: string) => boolean
  renderer: string
  rendererImport: ReturnType<typeof defineAsyncComponent>
}

export const lenses: Lens[] = [
  jsonLens,
  imageLens,
  htmlLens,
  xmlLens,
  pdfLens,
  audioLens,
  videoLens,
  rawLens,
]

export function getSuitableLenses(response: HoppRESTResponse): Lens[] {
  // return empty array if response is loading or error
  if (
    response.type === "loading" ||
    response.type === "network_fail" ||
    response.type === "script_fail" ||
    response.type === "fail" ||
    response.type === "extension_error"
  )
    return []

  // Lowercase the content-type key because HTTP Headers are case-insensitive by spec
  const contentType = response.headers.find(
    (h) => h.key.toLowerCase() === "content-type"
  )

  // If no content type is found, return raw lens as fallback
  if (!contentType) return [rawLens]

  // For successful responses, use a smarter approach
  if (response.type === "success") {
    // First, get lenses that match the content type
    const matchingLenses = lenses.filter((lens) =>
      lens.isSupportedContentType(contentType.value)
    )

    // For text-based content types, check if content can be parsed as other formats
    const isTextBased =
      contentType.value.includes("text/") ||
      contentType.value.includes("application/javascript") ||
      contentType.value.includes("application/xml") ||
      contentType.value.includes("application/xhtml+xml") ||
      htmlLens.isSupportedContentType(contentType.value)

    if (isTextBased && response.body) {
      // Check if content is valid JSON
      if (
        isValidJSONResponse(response.body) &&
        !matchingLenses.includes(jsonLens)
      ) {
        // Add JSON lens as an additional option, but keep it after the original content type lens
        // This ensures the original content type lens is selected by default
        matchingLenses.push(jsonLens)
      }

      // Add other content type detection here if needed
      // e.g., check if content is valid XML, HTML, etc.
    }

    // If no matching lenses found, include all lenses to give user full control
    if (matchingLenses.length === 0) {
      return lenses
    }

    // Always include raw lens for viewing the raw response
    if (!matchingLenses.includes(rawLens)) {
      matchingLenses.push(rawLens)
    }

    // Return matching lenses plus raw lens
    return matchingLenses
  }

  // For other response types, use the standard content type detection
  const result = []
  for (const lens of lenses) {
    if (lens.isSupportedContentType(contentType.value)) result.push(lens)
  }
  return result
}

type LensRenderers = {
  [key: string]: Lens["rendererImport"]
}

export function getLensRenderers(): LensRenderers {
  const response: LensRenderers = {}
  for (const lens of lenses) {
    response[lens.renderer] = lens.rendererImport
  }
  return response
}
