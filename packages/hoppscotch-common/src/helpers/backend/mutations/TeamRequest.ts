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
  UpdateLookUpRequestOrderDocument,
  UpdateLookUpRequestOrderMutation,
  UpdateLookUpRequestOrderMutationVariables,
  UpdateRequestDocument,
  UpdateRequestMutation,
  UpdateRequestMutationVariables,
} from "../graphql"

type DeleteRequestErrors = "team_req/not_found"

type MoveRestTeamRequestErrors =
  | "team_req/not_found"
  | "team_req/invalid_target_id"
  | "team/invalid_coll_id"
  | "team_req/not_required_role"
  | "bug/team_req/no_req_id"

type UpdateLookUpRequestOrderErrors =
  | "team_req/not_found"
  | "team/request_and_next_request_are_same"
  | "team_req/requests_not_from_same_collection"

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

export const moveRESTTeamRequest = (collectionID: string, requestID: string) =>
  runMutation<
    MoveRestTeamRequestMutation,
    MoveRestTeamRequestMutationVariables,
    MoveRestTeamRequestErrors
  >(MoveRestTeamRequestDocument, {
    collectionID,
    requestID,
  })

export const updateOrderRESTTeamRequest = (
  requestID: string,
  nextRequestID: string | null,
  collectionID: string
) =>
  runMutation<
    UpdateLookUpRequestOrderMutation,
    UpdateLookUpRequestOrderMutationVariables,
    UpdateLookUpRequestOrderErrors
  >(UpdateLookUpRequestOrderDocument, {
    requestID,
    nextRequestID,
    collectionID,
  })
