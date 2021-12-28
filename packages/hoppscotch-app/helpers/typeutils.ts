export type FieldEquals<T, K extends keyof T, Vals extends T[K][]> = {
  // eslint-disable-next-line
  [_x in K]: Vals[number]
}

export const objectFieldIncludes = <
  T,
  K extends keyof T,
  V extends readonly T[K][]
>(
  obj: T,
  field: K,
  values: V
  // eslint-disable-next-line
): obj is T & { [_x in K]: V[number] } => {
  return values.includes(obj[field])
}
