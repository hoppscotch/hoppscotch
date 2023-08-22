import * as Eq from "fp-ts/Eq"
import * as S from "fp-ts/string"
import isEqual from "lodash-es/isEqual"

/*
 * Eq-s are fp-ts an interface (type class) that defines how the equality
 * of 2 values of a certain type are matched as equal
 */

/**
 * Create an Eq from a non-undefinable value and makes it accept undefined
 * @param eq The non nullable Eq to add to
 * @returns The updated Eq which accepts undefined
 */
export const undefinedEq = <T>(eq: Eq.Eq<T>): Eq.Eq<T | undefined> => ({
  equals(x: T | undefined, y: T | undefined) {
    if (x !== undefined && y !== undefined) {
      return eq.equals(x, y)
    }

    return x === undefined && y === undefined
  },
})

/**
 * An Eq which compares by transforming based on a mapping function and then applying the Eq to it
 * @param map The mapping function to map values to
 * @param eq The Eq which takes the value which the map returns
 * @returns An Eq which takes the input of the mapping function
 */
export const mapThenEq = <A, B>(map: (x: A) => B, eq: Eq.Eq<B>): Eq.Eq<A> => ({
  equals(x: A, y: A) {
    return eq.equals(map(x), map(y))
  },
})

/**
 * An Eq which checks equality of 2 string in a case insensitive way
 */
export const stringCaseInsensitiveEq: Eq.Eq<string> = mapThenEq(
  S.toLowerCase,
  S.Eq
)

/**
 * An Eq that does equality check with Lodash's isEqual function
 */
export const lodashIsEqualEq: Eq.Eq<any> = {
  equals(x: any, y: any) {
    return isEqual(x, y)
  },
}
