import { HoppCollection } from "@hoppscotch/data"

export const myCollectionsExporter = (myCollections: HoppCollection[]) => {
  const sortedCollections = myCollections.map((collection) => ({
    ...collection,
    requests: collection.requests?.sort((a, b) => a.index - b.index) || [],
  }))
  return JSON.stringify(sortedCollections, null, 2)
}