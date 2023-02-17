import { HoppGQLRequest } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

/**
 * Safely tries to extract GQL Request data from an unknown value.
 * If we fail to detect certain bits, we just resolve it to the default value
 * @param x The value to extract GQL Request data from
 * @param defaultReq The default GQL Request to source from
 */

export function safelyExtractGQLRequest(
  x: unknown,
  defaultReq: HoppGQLRequest
): HoppGQLRequest {
  const req = cloneDeep(defaultReq)

  // TODO: A cleaner way to do this ?
  if (!!x && typeof x === "object") {
    if (x.hasOwnProperty("v") && typeof x.v === "string") req.v = x.v

    if (x.hasOwnProperty("id") && typeof x.id === "string") req.id = x.id

    if (x.hasOwnProperty("name") && typeof x.name === "string")
      req.name = x.name

    if (x.hasOwnProperty("url") && typeof x.url === "string") req.url = x.url

    if (x.hasOwnProperty("query") && typeof x.query === "string")
      req.query = x.query

    if (x.hasOwnProperty("variables") && typeof x.variables === "string")
      req.variables = x.variables

    if (x.hasOwnProperty("auth") && typeof x.auth === "object" && !!x.auth)
      req.auth = x.auth as any // TODO: Deep nested checks

    if (x.hasOwnProperty("headers") && Array.isArray(x.headers))
      req.headers = x.headers // TODO: Deep nested checks
  }

  return req
}
