import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import { HoppRESTHeader } from "@hoppscotch/data"
import * as RA from "fp-ts/ReadonlyArray"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { tupleToRecord } from "~/helpers/functional/record"
import {
  objHasProperty,
  objHasArrayProperty,
} from "~/helpers/functional/object"

export function getHeaders(parsedArguments: parser.Arguments) {
  let headers: Record<string, string> = {}

  headers = pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("H", "string")),
    O.map((args) => [args.H]),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasArrayProperty("H", "string")),
        O.map((args) => args.H)
      )
    ),
    O.map((h: string[]) =>
      pipe(
        h.map((header: string) => {
          const [key, value] = header.split(": ")
          return [key.trim(), value.trim()] as [string, string]
        }),
        RA.toArray,
        tupleToRecord
      )
    ),
    O.match(
      () => ({}),
      (h) => h
    )
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
    })),
    A.filter(
      (header) =>
        header.key !== "Authorization" &&
        header.key !== "content-type" &&
        header.key !== "Content-Type"
    )
  )
