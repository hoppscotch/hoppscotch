import gql from "graphql-tag"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { runMutation } from "../GQLClient"
import { TeamName } from "../types/TeamName"
import { TeamMemberRole } from "../types/TeamMemberRole"

type DeleteTeamErrors =
  | "team/not_required_role"
  | "team/invalid_id"
  | "team/member_not_found"
  | "ea/not_invite_or_admin"

type ExitTeamErrors =
  | "team/invalid_id"
  | "team/member_not_found"
  | "ea/not_invite_or_admin"

type CreateTeamErrors = "team/name_invalid" | "ea/not_invite_or_admin"

export const createTeam = (name: TeamName) =>
  pipe(
    runMutation<
      {
        createTeam: {
          id: string
          name: string
          members: Array<{ membershipID: string }>
          myRole: TeamMemberRole
          ownersCount: number
          editorsCount: number
          viewersCount: number
        }
      },
      CreateTeamErrors
    >(
      gql`
        mutation CreateTeam($name: String!) {
          createTeam(name: $name) {
            id
            name
            members {
              membershipID
            }
            myRole
            ownersCount
            editorsCount
            viewersCount
          }
        }
      `,
      {
        name,
      }
    ),
    TE.map(({ createTeam }) => createTeam)
  )

export const deleteTeam = (teamID: string) =>
  runMutation<void, DeleteTeamErrors>(
    gql`
      mutation DeleteTeam($teamID: ID!) {
        deleteTeam(teamID: $teamID)
      }
    `,
    {
      teamID,
    },
    {
      additionalTypenames: ["Team"],
    }
  )

export const leaveTeam = (teamID: string) =>
  runMutation<void, ExitTeamErrors>(
    gql`
      mutation ExitTeam($teamID: ID!) {
        leaveTeam(teamID: $teamID)
      }
    `,
    {
      teamID,
    },
    {
      additionalTypenames: ["Team"],
    }
  )
