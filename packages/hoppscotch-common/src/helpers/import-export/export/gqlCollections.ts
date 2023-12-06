import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"

export const gqlCollectionsExporter = (
  gqlCollections: HoppCollection<HoppGQLRequest>[]
) => {
  return JSON.stringify(gqlCollections, null, 2)
}
