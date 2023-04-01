import {
  runMutation,
  runGQLQuery,
  runGQLSubscription,
} from "@hoppscotch/common/helpers/backend/GQLClient"

import {
  CreateUserHistoryDocument,
  CreateUserHistoryMutation,
  CreateUserHistoryMutationVariables,
  DeleteAllUserHistoryDocument,
  DeleteAllUserHistoryMutation,
  DeleteAllUserHistoryMutationVariables,
  GetRestUserHistoryDocument,
  GetRestUserHistoryQuery,
  GetRestUserHistoryQueryVariables,
  RemoveRequestFromHistoryDocument,
  RemoveRequestFromHistoryMutation,
  RemoveRequestFromHistoryMutationVariables,
  ReqType,
  ToggleHistoryStarStatusDocument,
  ToggleHistoryStarStatusMutation,
  ToggleHistoryStarStatusMutationVariables,
  UserHistoryCreatedDocument,
  UserHistoryDeletedDocument,
  UserHistoryDeletedManyDocument,
  UserHistoryUpdatedDocument,
} from "../../api/generated/graphql"

export const getUserHistoryEntries = () =>
  runGQLQuery<GetRestUserHistoryQuery, GetRestUserHistoryQueryVariables, "">({
    query: GetRestUserHistoryDocument,
  })

export const createUserHistory = (
  reqData: string,
  resMetadata: string,
  reqType: ReqType
) =>
  runMutation<
    CreateUserHistoryMutation,
    CreateUserHistoryMutationVariables,
    ""
  >(CreateUserHistoryDocument, {
    reqData,
    resMetadata,
    reqType,
  })()

export const toggleHistoryStarStatus = (id: string) =>
  runMutation<
    ToggleHistoryStarStatusMutation,
    ToggleHistoryStarStatusMutationVariables,
    ""
  >(ToggleHistoryStarStatusDocument, {
    id,
  })()

export const removeRequestFromHistory = (id: string) =>
  runMutation<
    RemoveRequestFromHistoryMutation,
    RemoveRequestFromHistoryMutationVariables,
    ""
  >(RemoveRequestFromHistoryDocument, {
    id,
  })()

export const deleteAllUserHistory = (reqType: ReqType) =>
  runMutation<
    DeleteAllUserHistoryMutation,
    DeleteAllUserHistoryMutationVariables,
    ""
  >(DeleteAllUserHistoryDocument, {
    reqType,
  })()

export const runUserHistoryCreatedSubscription = () =>
  runGQLSubscription({
    query: UserHistoryCreatedDocument,
  })

export const runUserHistoryUpdatedSubscription = () =>
  runGQLSubscription({
    query: UserHistoryUpdatedDocument,
  })

export const runUserHistoryDeletedSubscription = () =>
  runGQLSubscription({
    query: UserHistoryDeletedDocument,
  })

export const runUserHistoryDeletedManySubscription = () =>
  runGQLSubscription({
    query: UserHistoryDeletedManyDocument,
  })
