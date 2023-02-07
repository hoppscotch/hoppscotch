import { runMutation } from "../GQLClient"
import {
  CreateRequestInCollectionDocument,
  CreateRequestInCollectionMutation,
  CreateRequestInCollectionMutationVariables,
  DeleteRequestDocument,
  DeleteRequestMutation,
  DeleteRequestMutationVariables,
  MoveRestTeamRequestDocument,
  MoveRestTeamRequestMutation,
  MoveRestTeamRequestMutationVariables,
  UpdateRequestDocument,
  UpdateRequestMutation,
  UpdateRequestMutationVariables,
} from "../graphql"

type MoveRestTeamRequestErrors =
  | "team_req/not_found"
  | "team_req/invalid_target_id"

type DeleteRequestErrors = "team_req/not_found"

export const createRequestInCollection = (
  collectionID: string,
  data: {
    request: string
    teamID: string
    title: string
  }
) =>
  runMutation<
    CreateRequestInCollectionMutation,
    CreateRequestInCollectionMutationVariables,
    ""
  >(CreateRequestInCollectionDocument, {
    collectionID,
    data,
  })

export const updateTeamRequest = (
  requestID: string,
  data: {
    request: string
    title: string
  }
) =>
  runMutation<UpdateRequestMutation, UpdateRequestMutationVariables, "">(
    UpdateRequestDocument,
    {
      requestID,
      data,
    }
  )

export const deleteTeamRequest = (requestID: string) =>
  runMutation<
    DeleteRequestMutation,
    DeleteRequestMutationVariables,
    DeleteRequestErrors
  >(DeleteRequestDocument, {
    requestID,
  })

export const moveRESTTeamRequest = (requestID: string, collectionID: string) =>
  runMutation<
    MoveRestTeamRequestMutation,
    MoveRestTeamRequestMutationVariables,
    MoveRestTeamRequestErrors
  >(MoveRestTeamRequestDocument, {
    requestID,
    collectionID,
  })
