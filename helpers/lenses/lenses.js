import jsonLens from "./jsonLens"
import rawLens from "./rawLens"
import imageLens from "./imageLens"
import htmlLens from "./htmlLens"
import xmlLens from "./xmlLens"

export const lenses = [jsonLens, imageLens, htmlLens, xmlLens, rawLens]

export function getSuitableLenses(response) {
  if (!response || !response.headers || !response.headers["content-type"])
    return [rawLens]

  const result = []
  for (const lens of lenses) {
    if (lens.isSupportedContentType(response.headers["content-type"]))
      result.push(lens)
  }

  return result
}

export function getLensRenderers() {
  const response = {}
  for (const lens of lenses) {
    response[lens.renderer] = lens.rendererImport
  }
  return response
}
