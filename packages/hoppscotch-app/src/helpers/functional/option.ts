import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { pipe } from "fp-ts/function"

/**
 * Tries to match one of the given predicates.
 * If a predicate is matched, the associated value is returned in a Some.
 * Else if none of the predicates is matched, None is returned.
 * @param choice An array of tuples having a predicate function and the selected value
 * @returns A function which takes the input and returns an Option
 */
export const optionChoose =
  <T, V>(choice: Array<[(x: T) => boolean, V]>) =>
  (input: T): O.Option<V> =>
    pipe(
      choice,
      A.findFirst(([pred]) => pred(input)),
      O.map(([_, value]) => value)
    )
