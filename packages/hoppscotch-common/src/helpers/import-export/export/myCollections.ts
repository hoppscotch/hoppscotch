import { HoppCollection } from "@hoppscotch/data"
import { stripRefIdReplacer } from "."
import { stripCollectionTreeForStore } from "~/helpers/secretVariables"

export const myCollectionsExporter = (myCollections: HoppCollection[]) => {
  const stripped = myCollections.map(stripCollectionTreeForStore)
  return JSON.stringify(stripped, stripRefIdReplacer, 2)
}
