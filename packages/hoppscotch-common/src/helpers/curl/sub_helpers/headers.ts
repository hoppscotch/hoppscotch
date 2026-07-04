import { HoppRESTHeader } from "@hoppscotch/data"
import * as A from "fp-ts/Array"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import parser from "yargs-parser"
import {
  objHasArrayProperty,
  objHasProperty,
} from "~/helpers/functional/object"
import { tupleToRecord } from "~/helpers/functional/record"

// RFC 9110: a header is "name: value". The name ends at the first colon;
// everything after the colon (trimmed) is the value, which may itself contain
// ": " sequences. Splitting on all ": " would silently drop such headers.
const getHeaderPair = (raw: string): O.Option<[string, string]> => {
  const idx = raw.indexOf(":")
  if (idx === -1) return O.none
  const key = raw.slice(0, idx).trim()
  const value = raw.slice(idx + 1).trim()
  if (!key) return O.none
  return O.some([key, value])
}

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
