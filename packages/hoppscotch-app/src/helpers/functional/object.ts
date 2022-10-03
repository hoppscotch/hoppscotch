import { pipe } from "fp-ts/function"
import { isEqual, cloneDeep } from "lodash-es"
import { JSPrimitive, TypeFromPrimitive } from "./primtive"

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

export const objHasProperty =
  <O extends object, K extends string, P extends JSPrimitive | undefined>(
    prop: K,
    type?: P
  ) =>
  // eslint-disable-next-line
  (obj: O): obj is O & { [_ in K]: TypeFromPrimitive<P> } =>
    // eslint-disable-next-line
    prop in obj && (type === undefined || typeof (obj as any)[prop] === type)

type TypeFromPrimitiveArray<P extends JSPrimitive | undefined> =
  P extends "undefined"
    ? undefined
    : P extends "object"
    ? object[] | null
    : P extends "boolean"
    ? boolean[]
    : P extends "number"
    ? number[]
    : P extends "bigint"
    ? bigint[]
    : P extends "string"
    ? string[]
    : P extends "symbol"
    ? symbol[]
    : P extends "function"
    ? Function[] // eslint-disable-line @typescript-eslint/ban-types
    : unknown[]

// The ban-types silence is because in this case,
// we can't get the Function type info to make a better guess

export const objHasArrayProperty =
  <O extends object, K extends string, P extends JSPrimitive>(
    prop: K,
    type: P
  ) =>
  // eslint-disable-next-line
  (obj: O): obj is O & { [_ in K]: TypeFromPrimitiveArray<P> } =>
    prop in obj &&
    Array.isArray((obj as any)[prop]) &&
    (obj as any)[prop].every(
      (val: unknown) => typeof val === type // eslint-disable-line
    )
