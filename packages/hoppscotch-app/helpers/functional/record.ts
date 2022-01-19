export const tupleToRecord = <
  KeyType extends string | number | symbol,
  ValueType
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType> =>
  (Object.assign as any)(...tuples.map(([key, val]) => ({ [key]: val })))
