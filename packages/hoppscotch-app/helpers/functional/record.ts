export const tupleToRecord = <
  KeyType extends string | number | symbol,
  ValueType
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType> =>
  tuples.length > 0
    ? (Object.assign as any)(...tuples.map(([key, val]) => ({ [key]: val })))
    : {}

export const tupleToRecordWithSameKeys = <
  KeyType extends string | number | symbol,
  ValueType
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType[]> => {
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
