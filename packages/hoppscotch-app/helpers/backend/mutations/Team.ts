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

type RenameTeamErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

type UpdateTeamMemberRoleErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

type RemoveTeamMemberErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

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

export const renameTeam = (teamID: string, newName: TeamName) =>
  pipe(
    runMutation<
      {
        renameTeam: {
          id: string
          name: TeamName
        }
      },
      RenameTeamErrors
    >(
      gql`
        mutation RenameTeam($newName: String!, $teamID: ID!) {
          renameTeam(newName: $newName, teamID: $teamID) {
            id
            name
          }
        }
      `,
      {
        newName,
        teamID,
      }
    ),
    TE.map(({ renameTeam }) => renameTeam)
  )

export const updateTeamMemberRole = (
  userUid: string,
  teamID: string,
  newRole: TeamMemberRole
) =>
  pipe(
    runMutation<
      {
        updateTeamMemberRole: {
          membershipID: string
          role: TeamMemberRole
        }
      },
      UpdateTeamMemberRoleErrors
    >(
      gql`
          mutation UpdateTeamMemberRole(
            $newRole: TeamMemberRole!,
            $userUid: ID!,
            teamID: ID!
          ) {
            updateTeamMemberRole(
              newRole: $newRole
              userUid: $userUid
              teamID: $teamID
            ) {
              membershipID
              role
            }
          }
        `,
      {
        newRole,
        userUid,
        teamID,
      }
    ),
    TE.map(({ updateTeamMemberRole }) => updateTeamMemberRole)
  )

export const removeTeamMember = (userUid: string, teamID: string) =>
  runMutation<void, RemoveTeamMemberErrors>(
    gql`
      mutation RemoveTeamMember($userUid: ID!, $teamID: ID!) {
        removeTeamMember(userUid: $userUid, teamID: $teamID)
      }
    `,
    {
      userUid,
      teamID,
    }
  )
