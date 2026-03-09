import { HoppCollection } from "@hoppscotch/data"
import { stripRefIdReplacer } from "."

export const gqlCollectionsExporter = (gqlCollections: HoppCollection[]) => {
  return JSON.stringify(gqlCollections, stripRefIdReplacer, 2)
}
