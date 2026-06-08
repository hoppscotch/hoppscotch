import {
  runMutation,
  runGQLQuery,
  runGQLSubscription,
} from "@helpers/backend/GQLClient"

import {
  CreateUserEnvironmentDocument,
  CreateUserEnvironmentMutation,
  CreateUserEnvironmentMutationVariables,
  UpdateUserEnvironmentMutation,
  UpdateUserEnvironmentMutationVariables,
  UpdateUserEnvironmentDocument,
  DeleteUserEnvironmentMutation,
  DeleteUserEnvironmentMutationVariables,
  DeleteUserEnvironmentDocument,
  ClearGlobalEnvironmentsMutation,
  ClearGlobalEnvironmentsMutationVariables,
  ClearGlobalEnvironmentsDocument,
  CreateUserGlobalEnvironmentMutation,
  CreateUserGlobalEnvironmentMutationVariables,
  CreateUserGlobalEnvironmentDocument,
  GetGlobalEnvironmentsDocument,
  GetGlobalEnvironmentsQueryVariables,
  GetGlobalEnvironmentsQuery,
  GetUserEnvironmentsDocument,
  UserEnvironmentCreatedDocument,
  UserEnvironmentUpdatedDocument,
  UserEnvironmentDeletedDocument,
} from "@app/api/generated/graphql"

export const createUserEnvironment = (name: string, variables: string) =>
  runMutation<
    CreateUserEnvironmentMutation,
    CreateUserEnvironmentMutationVariables,
    ""
  >(CreateUserEnvironmentDocument, {
    name,
    variables,
  })()

// `variables` is the pre-stringified JSON payload — callers decide which
// shape to serialise (a bare `Environment.variables` array for regular
// envs, a `GlobalEnvironment` wrapper `{ v, variables }` for the global
// env). Mirrors `createUserEnvironment` and lets the global-env caller
// preserve the wrapper shape on the wire without a union type / cast.
export const updateUserEnvironment = (
  id: string,
  name: string,
  variables: string
) =>
  runMutation<
    UpdateUserEnvironmentMutation,
    UpdateUserEnvironmentMutationVariables,
    ""
  >(UpdateUserEnvironmentDocument, {
    id,
    name,
    variables,
  })

export const deleteUserEnvironment = (id: string) =>
  runMutation<
    DeleteUserEnvironmentMutation,
    DeleteUserEnvironmentMutationVariables,
    ""
  >(DeleteUserEnvironmentDocument, {
    id,
  })

export const clearGlobalEnvironmentVariables = (id: string) =>
  runMutation<
    ClearGlobalEnvironmentsMutation,
    ClearGlobalEnvironmentsMutationVariables,
    ""
  >(ClearGlobalEnvironmentsDocument, {
    id,
  })()

export const getUserEnvironments = () =>
  runGQLQuery({
    query: GetUserEnvironmentsDocument,
    variables: {},
  })

export const getGlobalEnvironments = () =>
  runGQLQuery<
    GetGlobalEnvironmentsQuery,
    GetGlobalEnvironmentsQueryVariables,
    "user_environment/user_env_does_not_exists"
  >({
    query: GetGlobalEnvironmentsDocument,
    variables: {},
  })

export const createUserGlobalEnvironment = (variables: string) =>
  runMutation<
    CreateUserGlobalEnvironmentMutation,
    CreateUserGlobalEnvironmentMutationVariables,
    ""
  >(CreateUserGlobalEnvironmentDocument, {
    variables,
  })()

export const runUserEnvironmentCreatedSubscription = () =>
  runGQLSubscription({
    query: UserEnvironmentCreatedDocument,
    variables: {},
  })

export const runUserEnvironmentUpdatedSubscription = () =>
  runGQLSubscription({
    query: UserEnvironmentUpdatedDocument,
    variables: {},
  })

export const runUserEnvironmentDeletedSubscription = () =>
  runGQLSubscription({
    query: UserEnvironmentDeletedDocument,
    variables: {},
  })
