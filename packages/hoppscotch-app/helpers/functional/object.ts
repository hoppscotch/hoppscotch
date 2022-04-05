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

type JSPrimitive =
  | "undefined"
  | "object"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"

type TypeFromPrimitive<P extends JSPrimitive | undefined> =
  P extends "undefined"
    ? undefined
    : P extends "object"
    ? object | null // typeof null === "object"
    : P extends "boolean"
    ? boolean
    : P extends "number"
    ? number
    : P extends "bigint"
    ? BigInt
    : P extends "string"
    ? string
    : P extends "symbol"
    ? Symbol
    : P extends "function"
    ? Function
    : unknown

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
    ? BigInt[]
    : P extends "string"
    ? string[]
    : P extends "symbol"
    ? Symbol[]
    : P extends "function"
    ? Function[]
    : unknown[]

export const objHasProperty =
  <O extends object, K extends string, P extends JSPrimitive>(
    prop: K,
    type: P
  ) =>
  // eslint-disable-next-line
  (obj: O): obj is O & { [_ in K]: TypeFromPrimitive<P> } =>
    // eslint-disable-next-line
    prop in obj && typeof (obj as any)[prop] === type

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
