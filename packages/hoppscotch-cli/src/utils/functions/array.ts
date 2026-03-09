import { clone } from "lodash-es";

/**
 * Sorts the array based on the sort func.
 * NOTE: Creates a new array, if you don't need ref
 * to original array, use `arrayUnsafeSort` for better perf
 * @param sortFunc Sort function to sort against
 */
export const arraySort =
  <T>(sortFunc: (a: T, b: T) => number) =>
  (arr: T[]) => {
    const newArr = clone(arr);

    newArr.sort(sortFunc);

    return newArr;
  };

/**
 * Equivalent to `Array.prototype.flatMap`.
 * @param mapFunc The map function.
 * @returns Array formed by applying given mapFunc.
 */
export const arrayFlatMap =
  <T, U>(mapFunc: (value: T, index: number, arr: T[]) => U[]) =>
  (arr: T[]) =>
    arr.flatMap(mapFunc);

export const tupleToRecord = <
  KeyType extends string | number | symbol,
  ValueType,
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType> =>
  tuples.length > 0
    ? (Object.assign as any)(...tuples.map(([key, val]) => ({ [key]: val })))
    : {};
