import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"

export const objRemoveKey =
  <T, K extends keyof T>(key: K) =>
  (obj: T): Omit<T, K> =>
    pipe(cloneDeep(obj), (e) => {
      delete e[key]
      return e
    })
