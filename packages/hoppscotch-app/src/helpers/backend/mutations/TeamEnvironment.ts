import { runMutation } from "../GQLClient"
import {
  CreateDuplicateEnvironmentDocument,
  CreateDuplicateEnvironmentMutation,
  CreateDuplicateEnvironmentMutationVariables,
  CreateTeamEnvironmentDocument,
  CreateTeamEnvironmentMutation,
  CreateTeamEnvironmentMutationVariables,
  DeleteTeamEnvironmentDocument,
  DeleteTeamEnvironmentMutation,
  DeleteTeamEnvironmentMutationVariables,
  UpdateTeamEnvironmentDocument,
  UpdateTeamEnvironmentMutation,
  UpdateTeamEnvironmentMutationVariables,
} from "../graphql"

type DeleteTeamEnvironmentError = "team_environment/not_found"

type UpdateTeamEnvironmentError = "team_environment/not_found"

type DuplicateTeamEnvironmentError = "team_environment/not_found"

export const createTeamEnvironment = (
  variables: string,
  teamID: string,
  name: string
) =>
  runMutation<
    CreateTeamEnvironmentMutation,
    CreateTeamEnvironmentMutationVariables,
    ""
  >(CreateTeamEnvironmentDocument, {
    variables,
    teamID,
    name,
  })

export const deleteTeamEnvironment = (id: string) =>
  runMutation<
    DeleteTeamEnvironmentMutation,
    DeleteTeamEnvironmentMutationVariables,
    DeleteTeamEnvironmentError
  >(DeleteTeamEnvironmentDocument, {
    id,
  })

export const updateTeamEnvironment = (
  variables: string,
  id: string,
  name: string
) =>
  runMutation<
    UpdateTeamEnvironmentMutation,
    UpdateTeamEnvironmentMutationVariables,
    UpdateTeamEnvironmentError
  >(UpdateTeamEnvironmentDocument, {
    variables,
    id,
    name,
  })

export const createDuplicateEnvironment = (id: string) =>
  runMutation<
    CreateDuplicateEnvironmentMutation,
    CreateDuplicateEnvironmentMutationVariables,
    DuplicateTeamEnvironmentError
  >(CreateDuplicateEnvironmentDocument, {
    id,
  })
