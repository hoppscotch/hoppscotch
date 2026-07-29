import { importJSONToTeam } from "~/helpers/backend/mutations/TeamCollection"

export function toTeamsImporter(content: string, teamID: string) {
  return importJSONToTeam(content, teamID)
}
