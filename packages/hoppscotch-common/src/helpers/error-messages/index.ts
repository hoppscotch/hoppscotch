import { GQLError } from "../backend/GQLClient"

export const getEnvActionErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return "error.network_error"
  }

  switch (err.error) {
    case "team_environment/not_found":
      return "team_environment.not_found"
    case "team_environment/short_name":
      return "environment.short_name"
    case "Forbidden resource":
      return "profile.no_permission"
    case "team/legacy_workspace_blocked":
      return "team.legacy_workspace_blocked"
    case "legacy_workspace/migration_in_progress":
      return "team.migration_in_progress"
    default:
      return "error.something_went_wrong"
  }
}

/**
 * The message for a team request that failed to save. The save showed no
 * permission for every error, so the legacy workspace codes get their own
 * message and every other error keeps that one.
 */
export const getTeamRequestSaveErrorMessage = (err: GQLError<string>) => {
  if (err.type === "gql_error") {
    switch (err.error) {
      case "team/legacy_workspace_blocked":
        return "team.legacy_workspace_blocked"
      case "legacy_workspace/migration_in_progress":
        return "team.migration_in_progress"
    }
  }
  return "profile.no_permission"
}
