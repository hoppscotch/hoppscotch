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
            ? bigint
            : P extends "string"
              ? string
              : P extends "symbol"
                ? symbol
                : P extends "function"
                  ? Function // eslint-disable-line @typescript-eslint/ban-types
                  : unknown

// The ban-types silence is because in this case,
// we can't get the Function type info to make a better guess

export const isOfType =
  <T extends JSPrimitive>(type: T) =>
  (value: unknown): value is T =>
    // eslint-disable-next-line valid-typeof
    typeof value === type
