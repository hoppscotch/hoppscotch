import { HoppCollection } from "@hoppscotch/data"

export const gqlCollectionsExporter = (gqlCollections: HoppCollection[]) => {
  return JSON.stringify(gqlCollections, null, 2)
}
