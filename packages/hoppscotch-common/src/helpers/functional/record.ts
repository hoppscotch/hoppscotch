/**
 * Converts an array of key-value tuples (for e.g ["key", "value"]), into a record.
 * (for eg. output -> { "key": "value" })
 * NOTE: This function will discard duplicate key occurrences and only keep the last occurrence. If you do not want that behaviour,
 * use `tupleWithSamesKeysToRecord`.
 * @param tuples Array of tuples ([key, value])
 * @returns A record with value corresponding to the last occurrence of that key
 */
export const tupleToRecord = <
  KeyType extends string | number | symbol,
  ValueType,
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType> =>
  tuples.length > 0
    ? (Object.assign as any)(...tuples.map(([key, val]) => ({ [key]: val }))) // This is technically valid, but we have no way of telling TypeScript it is valid. Hence the assertion
    : {}

/**
 * Converts an array of key-value tuples (for e.g ["key", "value"]), into a record.
 * (for eg. output -> { "key": ["value"] })
 * NOTE: If you do not want the array as values (because of duplicate keys) and want to instead get the last occurance, use `tupleToRecord`
 * @param tuples Array of tuples ([key, value])
 * @returns A Record with values being arrays corresponding to each key occurance
 */
export const tupleWithSameKeysToRecord = <
  KeyType extends string | number | symbol,
  ValueType,
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType[]> => {
  // By the end of the function we do ensure this typing, this can't be infered now though, hence the assertion
  const out = {} as Record<KeyType, ValueType[]>

  for (const [key, value] of tuples) {
    if (!out[key]) {
      out[key] = [value]
    } else {
      out[key].push(value)
    }
  }

  return out
}
