import {
  HoppGQLRequest,
  HoppRESTRequest,
  isGQLRequest,
  translateToGQLRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import { runGQLQuery } from "../backend/GQLClient"
import {
  GetCollectionChildrenDocument,
  GetCollectionRequestsDocument,
  GetSingleRequestDocument,
} from "../backend/graphql"

/**
 * Defines how a Teams request is represented in TeamCollectionAdapter.
 * Unified collection: a single team collection holds REST and GQL requests.
 */
export interface TeamRequest {
  id: string
  collectionID: string
  title: string
  request: HoppRESTRequest | HoppGQLRequest
}

/**
 * Normalize the JSON `request` string from a team request row into the
 * canonical REST or GQL shape. Both branches go through their respective
 * `translateTo*` migrators so legacy schema versions get carried up to the
 * latest (e.g. v10 GQL rows pick up the `description` field added in v11).
 *
 * Defensive against:
 * - Malformed JSON (parse error → default REST request, doesn't throw).
 * - `null` / non-object payloads — `isGQLRequest` would otherwise throw
 *   `TypeError` on a non-object via the `in` operator.
 */
export function normalizeTeamRequestBody(
  raw: string
): HoppRESTRequest | HoppGQLRequest {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return translateToNewRequest(undefined)
  }

  if (
    parsed !== null &&
    typeof parsed === "object" &&
    isGQLRequest(parsed as HoppRESTRequest | HoppGQLRequest)
  ) {
    return translateToGQLRequest(parsed)
  }
  return translateToNewRequest(parsed)
}

export const getCollectionChildRequests = (collectionID: string) =>
  runGQLQuery({
    query: GetCollectionRequestsDocument,
    variables: {
      collectionID,
    },
  })

export const getSingleRequest = (requestID: string) =>
  runGQLQuery({
    query: GetSingleRequestDocument,
    variables: {
      requestID,
    },
  })

export const getCollectionChildCollections = (collectionID: string) =>
  runGQLQuery({
    query: GetCollectionChildrenDocument,
    variables: {
      collectionID,
    },
  })
