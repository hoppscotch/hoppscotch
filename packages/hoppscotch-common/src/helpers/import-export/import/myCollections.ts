import { ReqType } from "~/helpers/backend/graphql"
import { importJSONToTeam } from "~/helpers/backend/mutations/TeamCollection"

export function toTeamsImporter(
  content: string,
  teamID: string,
  type: ReqType
) {
  return importJSONToTeam(content, teamID, type)
}
