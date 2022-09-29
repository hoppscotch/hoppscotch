import { pipe, flow } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as Sep from "fp-ts/Separated"
import { HoppRESTParam } from "@hoppscotch/data"

const isDangling = ([, value]: [string, string]) => !value

/**
 * Converts queries to HoppRESTParam format and separates dangling ones
 * @param params Array of key value pairs of queries
 * @returns Object containing separated queries and dangling queries
 */
export function getQueries(params: Array<[string, string]>): {
  queries: Array<HoppRESTParam>
  danglingParams: Array<string>
} {
  return pipe(
    params,
    O.of,
    O.map(
      flow(
        A.partition(isDangling),
        Sep.bimap(
          A.map(([key, value]) => ({
            key,
            value,
            active: true,
          })),
          A.map(([key]) => key)
        ),
        (sep) => ({
          queries: sep.left,
          danglingParams: sep.right,
        })
      )
    ),
    O.getOrElseW(() => ({
      queries: [],
      danglingParams: [],
    }))
  )
}
