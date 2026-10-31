import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { getService } from "~/modules/dioc"
import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

import { runMutation } from "../GQLClient"
import {
  splitRequestForTeamCreate,
  redactRequestJsonForTeamWire,
  teamRequestTokenKey,
} from "../../teamOAuthTokens"
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
) => {
  const { wireJson, captured } = splitRequestForTeamCreate(data.request)

  return pipe(
    runMutation<
      CreateRequestInCollectionMutation,
      CreateRequestInCollectionMutationVariables,
      ""
    >(CreateRequestInCollectionDocument, {
      collectionID,
      data: {
        ...data,
        request: wireJson,
      },
    }),
    TE.map((result) => {
      const id = result.createRequestInCollection?.id
      if (id && captured) {
        getService(TeamOAuthTokenService).remember(
          teamRequestTokenKey(id),
          captured
        )
      }
      return result
    })
  )
}

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
      data: {
        ...data,
        request: redactRequestJsonForTeamWire(requestID, data.request),
      },
    }
  )

export const deleteTeamRequest = (requestID: string) =>
  pipe(
    runMutation<
      DeleteRequestMutation,
      DeleteRequestMutationVariables,
      DeleteRequestErrors
    >(DeleteRequestDocument, {
      requestID,
    }),
    TE.map((result) => {
      getService(TeamOAuthTokenService).forget(teamRequestTokenKey(requestID))
      return result
    })
  )

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
