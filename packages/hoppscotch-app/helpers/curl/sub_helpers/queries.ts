import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"

/**
 * Converts queries to HoppRESTParam format and separates dangling ones
 * @param queries Array or IterableIterator of key value pairs of queries
 * @returns Queries formatted compatible to HoppRESTParam and list of dangling params
 */
export function getQueries(
  searchParams:
    | [string, string][]
    | IterableIterator<[string, string]>
    | undefined
) {
  const danglingParams: string[] = []
  const queries = pipe(
    searchParams,
    O.fromNullable,
    O.map((iter) => {
      const params = []

      for (const q of iter) {
        if (!q[1]) {
          danglingParams.push(q[0])
          continue
        }
        params.push({
          key: q[0],
          value: q[1],
          active: true,
        })
      }
      return params
    }),

    O.getOrElseW(() => [])
  )

  return {
    queries,
    danglingParams,
  }
}
