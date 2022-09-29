import { runMutation } from "../GQLClient"
import {
  MoveRestTeamRequestDocument,
  MoveRestTeamRequestMutation,
  MoveRestTeamRequestMutationVariables,
} from "../graphql"

type MoveRestTeamRequestErrors =
  | "team_req/not_found"
  | "team_req/invalid_target_id"

export const moveRESTTeamRequest = (requestID: string, collectionID: string) =>
  runMutation<
    MoveRestTeamRequestMutation,
    MoveRestTeamRequestMutationVariables,
    MoveRestTeamRequestErrors
  >(MoveRestTeamRequestDocument, {
    requestID,
    collectionID,
  })
