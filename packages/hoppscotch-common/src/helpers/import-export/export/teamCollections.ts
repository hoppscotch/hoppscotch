import { getTeamCollectionJSON } from "~/helpers/backend/helpers"

export const teamCollectionsExporter = async (teamID: string) => {
  const collections = await getTeamCollectionJSON(teamID)
  if (collections && Array.isArray(collections)) {
    const sortedCollections = collections.map((collection) => ({
      ...collection,
      requests: collection.requests?.sort((a, b) => a.index - b.index) || [],
    }))
    return JSON.stringify(sortedCollections, null, 2)
  }
  return JSON.stringify([])
}