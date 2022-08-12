import { not } from "fp-ts/Predicate"
import { pipe, flow } from "fp-ts/function"
import * as Str from "fp-ts/string"
import * as RA from "fp-ts/ReadonlyArray"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import * as P from "parser-ts/Parser"
import * as S from "parser-ts/string"
import * as C from "parser-ts/char"
import { recordUpdate } from "./utils/record"

/**
 * Special characters in the Raw Key Value Grammar
 */
const SPECIAL_CHARS = ["#", ":"] as const

export type RawKeyValueEntry = {
  key: string
  value: string
  active: boolean
}

/* Beginning of Parser Definitions */

const wsSurround = P.surroundedBy(S.spaces)

const stringArrayJoin = (sep: string) => (input: string[]) => input.join(sep)

const stringTakeUntilChars = (chars: C.Char[]) => pipe(
  P.takeUntil((c: C.Char) => chars.includes(c)),
  P.map(stringArrayJoin("")),
)

const stringTakeUntilCharsInclusive = flow(
  stringTakeUntilChars,
  P.chainFirst(() => P.sat(() => true)),
)

const quotedString = pipe(
  S.doubleQuotedString,
  P.map((x) => JSON.parse(`"${x}"`))
)

const key = pipe(
  wsSurround(quotedString),

  P.alt(() =>
    pipe(
      stringTakeUntilChars([":", "\n"]),
      P.map(Str.trim)
    )
  )
)

const value = pipe(
  wsSurround(quotedString),

  P.alt(() =>
    pipe(
      stringTakeUntilChars(["\n"]),
      P.map(Str.trim)
    )
  )
)

const commented = pipe(
  S.maybe(S.string("#")),
  P.map(not(Str.isEmpty))
)

const line = pipe(
  wsSurround(commented),
  P.bindTo("commented"),

  P.bind("key", () => wsSurround(key)),

  P.chainFirst(() => C.char(":")),

  P.bind("value", () => value),
)

const lineWithNoColon = pipe(
  wsSurround(commented),
  P.bindTo("commented"),
  P.bind("key", () => P.either(
    stringTakeUntilCharsInclusive(["\n"]),
    () => pipe(
      P.manyTill(P.sat((_: string) => true), P.eof()),
      P.map(flow(
        RA.toArray,
        stringArrayJoin("")
      ))
    )
  )),
  P.map(flow(
    O.fromPredicate(({ key }) => !Str.isEmpty(key))
  ))
)

const file = pipe(
  P.manyTill(wsSurround(line), P.eof()),
)

/**
 * This Raw Key Value parser ignores the key value pair (no colon) issues
 */
const tolerantFile = pipe(
  P.manyTill(
    P.either(
      pipe(line, P.map(O.some)),
      () => pipe(
        lineWithNoColon,
        P.map(flow(
          O.map((a) => ({ ...a, value: "" }))
        ))
      )
    ),
    P.eof()
  ),
  P.map(flow(
    RA.filterMap(flow(
      O.fromPredicate(O.isSome),
      O.map((a) => a.value)
    ))
  ))
)

/* End of Parser Definitions */

/**
 * Detect whether the string needs to have escape characters in raw key value strings
 * @param input The string to check against
 */
const stringNeedsEscapingForRawKVString = (input: string) => {
  // If there are any of our special characters, it needs to be escaped definitely
  if (SPECIAL_CHARS.some((x) => input.includes(x)))
    return true

  // The theory behind this impl is that if we apply JSON.stringify on a string
  // it does escaping and then return a JSON string representation.
  // We remove the quotes of the JSON and see if it can be matched against the input string
  const stringified = JSON.stringify(input)

  const y = stringified
    .substring(1, stringified.length - 1)
    .trim()

  return y !== input
}

/**
 * Applies Raw Key Value escaping (via quotes + escape chars) if needed
 * @param input The input to apply escape on
 * @returns If needed, the escaped string, else the input string itself
 */
const applyEscapeIfNeeded = (input: string) =>
  stringNeedsEscapingForRawKVString(input)
    ? JSON.stringify(input)
    : input

/**
 * Converts Raw Key Value Entries to the file string format
 * @param entries The entries array
 * @returns The entries in string format
 */
export const rawKeyValueEntriesToString = (entries: RawKeyValueEntry[]) =>
  pipe(
    entries,
    A.map(
      flow(
        recordUpdate("key", applyEscapeIfNeeded),
        recordUpdate("value", applyEscapeIfNeeded),
        ({ key, value, active }) =>
          active ? `${(key)}: ${value}` : `# ${key}: ${value}`
      )
    ),
    stringArrayJoin("\n")
  )

/**
 * Parses raw key value entries string to array
 * @param s The file string to parse from
 * @returns Either the parser fail result or the raw key value entries
 */
export const parseRawKeyValueEntriesE = (s: string) =>
  pipe(
    tolerantFile,
    S.run(s),
    E.mapLeft((err) => ({
      message: `Expected ${err.expected.map((x) => `'${x}'`).join(", ")}`,
      expected: err.expected,
      pos: err.input.cursor,
    })),
    E.map(
      ({ value }) => pipe(
        value,
        RA.map(({ key, value, commented }) =>
          <RawKeyValueEntry>{
            active: !commented,
            key,
            value
          }
        )
      )
    )
  )

/**
 * Less error tolerating version of `parseRawKeyValueEntriesE`
 * @param s The file string to parse from
 * @returns Either the parser fail result or the raw key value entries
 */
export const strictParseRawKeyValueEntriesE = (s: string) =>
  pipe(
    file,
    S.run(s),
    E.mapLeft((err) => ({
      message: `Expected ${err.expected.map((x) => `'${x}'`).join(", ")}`,
      expected: err.expected,
      pos: err.input.cursor,
    })),
    E.map(
      ({ value }) => pipe(
        value,
        RA.map(({ key, value, commented }) =>
          <RawKeyValueEntry>{
            active: !commented,
            key,
            value
          }
        )
      )
    )
  )

/**
 * Kept for legacy code compatibility, parses raw key value entries.
 * If failed, it returns an empty array
 * @deprecated Use `parseRawKeyValueEntriesE` instead
 */
export const parseRawKeyValueEntries = flow(
  parseRawKeyValueEntriesE,
  E.map(RA.toArray),
  E.getOrElse(() => [] as RawKeyValueEntry[])
)
