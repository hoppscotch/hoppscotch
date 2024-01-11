import { getTeamCollectionJSON } from "~/helpers/backend/helpers"

export const teamCollectionsExporter = (teamID: string) => {
  return getTeamCollectionJSON(teamID)
}
