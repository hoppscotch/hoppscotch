import { HoppCollection } from "@hoppscotch/data"
import { stripRefIdReplacer } from "."

export const myCollectionsExporter = (myCollections: HoppCollection[]) => {
  return JSON.stringify(myCollections, stripRefIdReplacer, 2)
}
