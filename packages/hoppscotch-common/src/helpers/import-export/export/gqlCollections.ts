import { HoppCollection } from "@hoppscotch/data"
import { stripRefIdReplacer } from "."
import { stripCollectionTreeForStore } from "~/helpers/secretVariables"

export const gqlCollectionsExporter = (gqlCollections: HoppCollection[]) => {
  const stripped = gqlCollections.map(stripCollectionTreeForStore)
  return JSON.stringify(stripped, stripRefIdReplacer, 2)
}
