import type { RelayRequest } from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { cloneDeep } from "lodash-es"
import superjson from "superjson"

import { useSetting } from "~/composables/settings"

const isEncoded = (value: string): boolean =>
  pipe(
    E.tryCatch(
      () => value !== decodeURIComponent(value),
      () => false
    ),
    E.getOrElse(() => false)
  )

const encodeParam = (value: string): string =>
  pipe(
    O.some(value),
    O.filter((v) => !isEncoded(v)),
    O.map(encodeURIComponent),
    O.getOrElse(() => value)
  )

const processParams = (params: [string, string][]): [string, string][] => {
  const encodeMode = useSetting("ENCODE_MODE").value

  const needsEncoding = (v: string) =>
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(v)

  return params.map(([key, value]) => {
    const isEncodingRequired =
      encodeMode === "enable" || (encodeMode === "auto" && needsEncoding(value))

    const encodedValue = isEncodingRequired ? encodeParam(value) : value

    return [key, encodedValue]
  })
}

const buildQueryString = (params: [string, string][]): string =>
  params.map(([k, v]) => `${encodeURIComponent(k)}=${v}`).join("&")

const combineWithExistingSearch = (urlObj: URL, queryString: string): URL => {
  const existingSearch =
    urlObj.search.length > 1 ? urlObj.search.substring(1) : ""

  urlObj.search = pipe(
    existingSearch,
    O.fromPredicate((s) => s.length > 0),
    O.map((s) => `${s}&${queryString}`),
    O.getOrElse(() => queryString)
  )

  return urlObj
}

const updateUrl = (
  url: string,
  params: [string, string][]
): E.Either<Error, string> =>
  pipe(
    E.tryCatch(
      () => new URL(url),
      (e) => new Error(`Invalid URL: ${e}`)
    ),
    E.map((urlObj) => {
      const processedParams = processParams(params)

      if (processedParams.length > 0) {
        const queryString = buildQueryString(processedParams)
        return combineWithExistingSearch(urlObj, queryString)
      }

      return urlObj
    }),
    E.map((u) => u.toString())
  )

export const preProcessRelayRequest = (req: RelayRequest): RelayRequest =>
  pipe(cloneDeep(req), (req) =>
    req.params
      ? pipe(
          updateUrl(req.url, req.params),
          E.map((url) => ({ ...req, url, params: {} })),
          E.getOrElse(() => req)
        )
      : req
  )

export const postProcessRelayRequest = (req: RelayRequest): RelayRequest =>
  pipe(cloneDeep(req), (req) => superjson.serialize(req).json)
