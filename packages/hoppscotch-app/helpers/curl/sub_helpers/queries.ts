import { pipe, flow } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as Sep from "fp-ts/Separated"
import { HoppRESTParam } from "@hoppscotch/data"

const isDangling = ([_, value]: [string, string]) => !value

/**
 * Converts queries to HoppRESTParam format and separates dangling ones
 * @param queries Array of key value pairs of queries
 * @returns Queries of type Array<HoppRESTParam> and list of dangling params
 */
export function getQueries(searchParams: Array<[string, string]>): {
  queries: Array<HoppRESTParam>
  danglingParams: Array<string>
} {
  return pipe(
    searchParams,
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
