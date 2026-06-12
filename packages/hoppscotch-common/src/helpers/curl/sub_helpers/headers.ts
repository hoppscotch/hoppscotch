import { HoppRESTHeader } from "@hoppscotch/data"
import * as A from "fp-ts/Array"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as S from "fp-ts/string"
import parser from "yargs-parser"
import {
  objHasArrayProperty,
  objHasProperty,
} from "~/helpers/functional/object"
import { tupleToRecord } from "~/helpers/functional/record"

/**
 * Splits a string on the first occurrence of the separator.
 * Unlike S.split, this returns at most 2 parts, which ensures
 * header values containing ": " (colon + space) are not split
 * into more than 2 segments.
 */
const splitAtFirst = (sep: string) => (s: string): string[] => {
  const idx = s.indexOf(sep)
  return idx === -1 ? [s] : [s.slice(0, idx), s.slice(idx + sep.length)]
}

const getHeaderPair = flow(
  S.replace(":", ": "),
  splitAtFirst(": "),
  // must have a key and a value
  O.fromPredicate((arr) => arr.length === 2),
  O.map(([k, v]) => [k.trim(), v?.trim() ?? ""] as [string, string])
)

export function getHeaders(parsedArguments: parser.Arguments) {
  let headers: Record<string, string> = {}

  headers = pipe(
    parsedArguments,
    // make it an array if not already
    O.fromPredicate(objHasProperty("H", "string")),
    O.map((args) => [args.H]),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasArrayProperty("H", "string")),
        O.map((args) => args.H)
      )
    ),
    O.map(
      flow(
        A.map(getHeaderPair),
        A.filterMap((a) => a),
        tupleToRecord
      )
    ),
    O.getOrElseW(() => ({}))
  )

  if (
    objHasProperty("A", "string")(parsedArguments) ||
    objHasProperty("user-agent", "string")(parsedArguments)
  )
    headers["User-Agent"] = parsedArguments.A ?? parsedArguments["user-agent"]

  const rawContentType =
    headers["Content-Type"] ?? headers["content-type"] ?? ""

  return {
    headers,
    rawContentType,
  }
}

export const recordToHoppHeaders = (
  headers: Record<string, string>
): HoppRESTHeader[] =>
  pipe(
    Object.keys(headers),
    A.map((key) => ({
      key,
      value: headers[key],
      active: true,
      description: "",
    })),
    A.filter(
      (header) => header.key !== "content-type" && header.key !== "Content-Type"
    )
  )
