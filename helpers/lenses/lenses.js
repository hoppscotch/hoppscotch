import jsonLens from "./jsonLens"
import rawLens from "./rawLens"
import imageLens from "./imageLens"
import htmlLens from "./htmlLens"
import xmlLens from "./xmlLens"

export const lenses = [jsonLens, imageLens, htmlLens, xmlLens, rawLens]

export function getSuitableLenses(response) {
  const result = []

  if (response && response.headers && response.headers["content-type"]) {
    const properContentType = response.headers["content-type"].split(";")[0]

    for (const lens of lenses) {
      if (
        lens.supportedContentTypes === null ||
        lens.supportedContentTypes.includes(properContentType)
      ) {
        result.push(lens)
      }
    }
  } else {
    // We don't know the content type, so lets just add rawLens
    result.push(rawLens)
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
