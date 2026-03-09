import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { pipe, flow } from "fp-ts/function"

import { MediaType, RelayResponseBody } from "@hoppscotch/kernel"

import { decodeToString } from "~/helpers/functional/parse"
import { safeParseJSONOrYAML } from "./yaml"

type SafeParseJSON = {
  (str: string, convertToArray: true): O.Option<Array<unknown>>
  (str: string, convertToArray?: false): O.Option<Record<string, unknown>>
}

/**
 * Checks and Parses JSON string
 * @param str Raw JSON data to be parsed
 * @returns Option type with some(JSON data) or none
 */
export const safeParseJSON: SafeParseJSON = (str, convertToArray = false) =>
  O.tryCatch(() => {
    const data = JSON.parse(str)
    if (convertToArray) {
      return Array.isArray(data) ? data : [data]
    }
    return data
  })

/**
 * Generates a prettified JSON representation of an object
 * @param obj The object to get the representation of
 * @returns The prettified JSON string of the object
 */
export const prettyPrintJSON = (obj: unknown): O.Option<string> =>
  O.tryCatch(() => JSON.stringify(obj, null, "\t"))

/**
 * Checks if given string is a JSON string
 * @param str Raw string to be checked
 * @returns If string is a JSON string
 */
export const isJSON = flow(safeParseJSON, O.isSome)

export const parseBytesToJSON = <T>(content: Uint8Array): O.Option<T> =>
  pipe(
    content,
    decodeToString,
    E.chain(parseJSONAs<T>),
    E.fold(() => O.none, O.some)
  )

export const parseJSONAs = <T>(str: string): E.Either<Error, T> =>
  E.tryCatch(() => JSON.parse(str) as T, E.toError)

export const parseBodyAsJSON = <T>(body: RelayResponseBody): O.Option<T> =>
  pipe(
    O.fromNullable(body.mediaType),
    O.filter((type) => type.includes(MediaType.APPLICATION_JSON)),
    O.chain(() => parseBytesToJSON<T>(body.body))
  )

/**
 * Parses response body as JSON or YAML content
 * @param body Response body from RelayResponse
 * @returns Option containing parsed data or none if parsing fails
 */
export const parseBodyAsJSONOrYAML = <T>(
  body: RelayResponseBody
): O.Option<T> =>
  pipe(
    body.body,
    decodeToString,
    E.fold(() => O.none, safeParseJSONOrYAML),
    O.map((data) => data as T)
  )
