import {
  HoppGQLRequest,
  HoppGQLResponseOriginalRequest,
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"

type AnyRequest =
  | HoppRESTRequest
  | HoppRESTResponseOriginalRequest
  | HoppGQLRequest
  | HoppGQLResponseOriginalRequest

/**
 * Type guard to check if a request object is GraphQL-shaped.
 * GQL requests / saved example original-requests have `url` but not `endpoint`.
 */
export function isGQLRequest(
  req: AnyRequest
): req is HoppGQLRequest | HoppGQLResponseOriginalRequest {
  return "url" in req && !("endpoint" in req)
}

/**
 * Type guard to check if a request object is REST-shaped.
 */
export function isRESTRequest(
  req: AnyRequest
): req is HoppRESTRequest | HoppRESTResponseOriginalRequest {
  return "endpoint" in req
}
