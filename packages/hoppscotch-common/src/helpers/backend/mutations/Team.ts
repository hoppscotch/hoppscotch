import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { runMutation } from "../GQLClient"
import { TeamName } from "../types/TeamName"
import {
  DeleteTeamDocument,
  DeleteTeamMutation,
  DeleteTeamMutationVariables,
  LeaveTeamDocument,
  LeaveTeamMutation,
  LeaveTeamMutationVariables,
  RemoveTeamMemberDocument,
  RemoveTeamMemberMutation,
  RemoveTeamMemberMutationVariables,
  RenameTeamDocument,
  RenameTeamMutation,
  RenameTeamMutationVariables,
  TeamAccessRole,
  UpdateTeamAccessRoleDocument,
  UpdateTeamAccessRoleMutation,
  UpdateTeamAccessRoleMutationVariables,
} from "../graphql"
import { platform } from "~/platform"

type DeleteTeamErrors =
  | "team/not_required_role"
  | "team/invalid_id"
  | "team/member_not_found"
  | "ea/not_invite_or_admin"

type LeaveTeamErrors =
  | "team/invalid_id"
  | "team/member_not_found"
  | "ea/not_invite_or_admin"

type CreateTeamErrors = "team/name_invalid" | "ea/not_invite_or_admin"

type RenameTeamErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

type UpdateTeamAccessRoleErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

type RemoveTeamMemberErrors =
  | "ea/not_invite_or_admin"
  | "team/invalid_id"
  | "team/not_required_role"

export const createTeam = (name: TeamName) => {
  return pipe(
    platform.backend.createTeam<CreateTeamErrors>(name),
    TE.map(({ createTeam }) => createTeam)
  )
}

export const deleteTeam = (teamID: string) =>
  runMutation<
    DeleteTeamMutation,
    DeleteTeamMutationVariables,
    DeleteTeamErrors
  >(
    DeleteTeamDocument,
    {
      teamID,
    },
    {
      additionalTypenames: ["Team"],
    }
  )

export const leaveTeam = (teamID: string) =>
  runMutation<LeaveTeamMutation, LeaveTeamMutationVariables, LeaveTeamErrors>(
    LeaveTeamDocument,
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
      RenameTeamMutation,
      RenameTeamMutationVariables,
      RenameTeamErrors
    >(RenameTeamDocument, {
      newName,
      teamID,
    }),
    TE.map(({ renameTeam }) => renameTeam)
  )

export const updateTeamAccessRole = (
  userUid: string,
  teamID: string,
  newRole: TeamAccessRole
) =>
  pipe(
    runMutation<
      UpdateTeamAccessRoleMutation,
      UpdateTeamAccessRoleMutationVariables,
      UpdateTeamAccessRoleErrors
    >(UpdateTeamAccessRoleDocument, {
      newRole,
      userUid,
      teamID,
    }),
    TE.map(({ updateTeamAccessRole }) => updateTeamAccessRole)
  )

export const removeTeamMember = (userUid: string, teamID: string) =>
  runMutation<
    RemoveTeamMemberMutation,
    RemoveTeamMemberMutationVariables,
    RemoveTeamMemberErrors
  >(RemoveTeamMemberDocument, {
    userUid,
    teamID,
  })
