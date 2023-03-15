import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as RR from "fp-ts/ReadonlyRecord"
import { HoppRESTRequest } from "@hoppscotch/data"

export const REQUEST_METHOD_LABEL_COLORS = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
} as const

/**
 * Returns the label color tailwind class for a request
 * @param request The HoppRESTRequest object to get the value for
 * @returns The class value for the given HTTP VERB, if not, a generic verb class
 */
export function getMethodLabelColorClassOf(request: HoppRESTRequest) {
  return pipe(
    REQUEST_METHOD_LABEL_COLORS,
    RR.lookup(request.method.toLowerCase()),
    O.getOrElseW(() => REQUEST_METHOD_LABEL_COLORS.default)
  )
}
