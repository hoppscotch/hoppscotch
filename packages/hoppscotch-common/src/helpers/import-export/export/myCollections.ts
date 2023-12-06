import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export const myCollectionsExporter = (
  myCollections: HoppCollection<HoppRESTRequest>[]
) => {
  return JSON.stringify(myCollections, null, 2)
}
