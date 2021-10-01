import gql from "graphql-tag"
import { runMutation } from "../GQLClient"

type DeleteTeamErrors =
  | "team/not_required_role"
  | "team/invalid_id"
  | "team/member_not_found"

type ExitTeamErrors = "team/invalid_id" | "team/member_not_found"

export const deleteTeam = (teamID: string) =>
  runMutation<void, DeleteTeamErrors>(
    gql`
      mutation DeleteTeam($teamID: String!) {
        deleteTeam(teamID: $teamID)
      }
    `,
    {
      teamID,
    }
  )

export const leaveTeam = (teamID: string) =>
  runMutation<void, ExitTeamErrors>(
    gql`
      mutation ExitTeam($teamID: String!) {
        leaveTeam(teamID: $teamID)
      }
    `,
    {
      teamID,
    }
  )
