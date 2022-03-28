import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import isEqual from "lodash/isEqual"

export const objRemoveKey =
  <T, K extends keyof T>(key: K) =>
  (obj: T): Omit<T, K> =>
    pipe(cloneDeep(obj), (e) => {
      delete e[key]
      return e
    })

export const objFieldMatches =
  <T, K extends keyof T, V extends T[K]>(
    fieldName: K,
    matches: ReadonlyArray<V>
  ) =>
  // eslint-disable-next-line no-unused-vars
  (obj: T): obj is T & { [_ in K]: V } =>
    matches.findIndex((x) => isEqual(obj[fieldName], x)) !== -1
