import {
  HoppGQLRequest,
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"

/**
 * Type guard to check if a request object is a GraphQL request.
 * GQL requests have `url` but not `endpoint`; REST requests have `endpoint`.
 */
export function isGQLRequest(
  req: HoppRESTRequest | HoppRESTResponseOriginalRequest | HoppGQLRequest
): req is HoppGQLRequest {
  return "url" in req && !("endpoint" in req)
}

/**
 * Type guard to check if a request object is a REST request.
 * REST requests have `endpoint`.
 */
export function isRESTRequest(
  req: HoppRESTRequest | HoppRESTResponseOriginalRequest | HoppGQLRequest
): req is HoppRESTRequest | HoppRESTResponseOriginalRequest {
  return "endpoint" in req
}
