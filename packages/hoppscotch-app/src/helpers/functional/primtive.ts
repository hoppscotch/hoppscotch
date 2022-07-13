export type JSPrimitive =
  | "undefined"
  | "object"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"

export type TypeFromPrimitive<P extends JSPrimitive | undefined> =
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

export const isOfType =
  <T extends JSPrimitive>(type: T) =>
  (value: unknown): value is T =>
    // eslint-disable-next-line valid-typeof
    typeof value === type
