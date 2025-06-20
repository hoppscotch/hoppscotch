import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { pipe, flow } from "fp-ts/function"
import * as LosslessJSON from "lossless-json"

import { MediaType, RelayResponseBody } from "@hoppscotch/kernel"

import { decodeToString } from "~/helpers/functional/parse"
import { safeParseJSONOrYAML } from "./yaml"

type SafeParseJSON = {
  (
    str: string,
    convertToArray: true,
    lossless?: boolean
  ): O.Option<Array<unknown>>
  (
    str: string,
    convertToArray?: false,
    lossless?: boolean
  ): O.Option<Record<string, unknown>>
}

const losslessReviver = (_key: string, value: any) =>
  value && value.isLosslessNumber ? value.toString() : value

const parseWith = (lossless: boolean) => (str: string) =>
  lossless ? LosslessJSON.parse(str, losslessReviver) : JSON.parse(str)

const maybeConvertToArray = (convertToArray: boolean) => (data: any) =>
  convertToArray ? (Array.isArray(data) ? data : [data]) : data

/**
 * Checks and Parses JSON string
 * @param str Raw JSON data to be parsed
 * @param convertToArray Whether to convert non-array results to array
 * @param lossless Whether to use lossless parsing for floating point precision
 * @returns Option type with some(JSON data) or none
 */
export const safeParseJSON: SafeParseJSON = (
  str,
  convertToArray = false,
  lossless = false
) =>
  pipe(
    str,
    (s) => O.tryCatch(() => parseWith(lossless)(s)),
    O.map(maybeConvertToArray(convertToArray))
  )

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

export const parseJSONAs = <T>(
  str: string,
  lossless = false
): E.Either<Error, T> =>
  E.tryCatch(() => parseWith(lossless)(str) as T, E.toError)

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
