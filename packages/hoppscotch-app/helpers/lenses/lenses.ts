import { HoppRESTResponse } from "../types/HoppRESTResponse"
import jsonLens from "./jsonLens"
import rawLens from "./rawLens"
import imageLens from "./imageLens"
import htmlLens from "./htmlLens"
import xmlLens from "./xmlLens"

export type Lens = {
  lensName: string
  isSupportedContentType: (contentType: string) => boolean
  renderer: string
  rendererImport: () => Promise<typeof import("*.vue")>
}

export const lenses: Lens[] = [jsonLens, imageLens, htmlLens, xmlLens, rawLens]

export function getSuitableLenses(response: HoppRESTResponse): Lens[] {
  // return empty array if response is loading or error
  if (response.type === "loading" || response.type === "network_fail") return []

  const contentType = response.headers.find((h) => h.key === "content-type")

  if (!contentType) return [rawLens]

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
