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

const getHeaderPair = (header: string): O.Option<[string, string]> => {
  // Normalize headers that omit the space after the colon (e.g. "X-Foo:bar" → "X-Foo: bar")
  // before looking for the separator. Only add a space when none follows the colon.
  const normalized = /^[^:]+:(?! )/.test(header)
    ? header.replace(":", ": ")
    : header

  // Per RFC 9110 §5.1, the field name is everything before the FIRST colon and
  // the field value is everything after. Splitting on the first ": " preserves
  // colons that appear inside the value (e.g. "X-Note: hello: world").
  const separatorIndex = normalized.indexOf(": ")
  if (separatorIndex === -1) return O.none

  const key = normalized.slice(0, separatorIndex).trim()
  const value = normalized.slice(separatorIndex + 2).trim()

  if (!key) return O.none

  return O.some([key, value] as [string, string])
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
