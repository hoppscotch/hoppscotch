import { HoppCollection } from "@hoppscotch/data"

export const myCollectionsExporter = (myCollections: HoppCollection[]) => {
  return JSON.stringify(myCollections, null, 2)
}
