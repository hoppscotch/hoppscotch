import jsonLens from "./jsonLens"
import rawLens from "./rawLens"
import imageLens from "./imageLens"
import htmlLens from "./htmlLens"
import xmlLens from "./xmlLens"

export const lenses = [jsonLens, imageLens, htmlLens, xmlLens, rawLens]

export function getSuitableLenses(response) {
  const contentType = response.headers.find((h) => h.key === "content-type")
  console.log(contentType)

  if (!contentType) return [rawLens]

  const result = []
  for (const lens of lenses) {
    if (lens.isSupportedContentType(contentType.value)) result.push(lens)
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
