import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import { stringArrayJoin } from "~/helpers/functional/array"

const defaultRESTReq = getDefaultRESTRequest()

const getProtocolFromURL = (url: string) =>
  pipe(
    // get the base URL
    /^([^\s:@]+:[^\s:@]+@)?([^:/\s]+)([:]*)/.exec(url),
    O.fromNullable,
    O.filter((burl) => burl.length > 1),
    O.map((burl) => burl[2]),
    // set protocol to http for local URLs
    O.map((burl) =>
      burl === "localhost" ||
      burl === "2130706433" ||
      /127(\.0){0,2}\.1/.test(burl) ||
      /0177(\.0){0,2}\.1/.test(burl) ||
      /0x7f(\.0){0,2}\.1/.test(burl) ||
      /192\.168(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){2}/.test(burl) ||
      /10(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}/.test(burl)
        ? "http://" + url
        : "https://" + url
    )
  )

/**
 * Checks if the URL is valid using the URL constructor
 * @param urlString URL string (with protocol)
 * @returns boolean whether the URL is valid using the inbuilt URL class
 */
const isURLValid = (urlString: string) =>
  pipe(
    O.tryCatch(() => new URL(urlString)),
    O.isSome
  )

/**
 * Checks and returns URL object for the valid URL
 * @param urlText Raw URL string provided by argument parser
 * @returns Option of URL object
 */
const parseURL = (urlText: string | number) =>
  pipe(
    urlText,
    O.fromNullable,
    // preprocess url string
    O.map((u) => u.toString().replaceAll(/[^a-zA-Z0-9_\-./?&=:@%+#,;\s]/g, "")),
    O.filter((u) => u.length > 0),
    O.chain((u) =>
      pipe(
        u,
        // check if protocol is available
        O.fromPredicate(
          (url: string) => /^[^:\s]+(?=:\/\/)/.exec(url) !== null
        ),
        O.alt(() => getProtocolFromURL(u))
      )
    ),
    O.filter(isURLValid),
    O.map((u) => new URL(u))
  )

/**
 * Processes URL string and returns the URL object
 * @param parsedArguments Parsed Arguments object
 * @returns URL object
 */
export function getURLObject(parsedArguments: parser.Arguments) {
  return pipe(
    // contains raw url strings
    parsedArguments._.slice(1),
    A.findFirstMap(parseURL),
    // no url found
    O.getOrElse(() => new URL(defaultRESTReq.endpoint))
  )
}

/**
 * Joins dangling params to origin
 * @param urlObject URL object containing origin and pathname
 * @param danglingParams Keys of params with empty values
 * @returns origin string concatenated with dangling paramas
 */
export function concatParams(urlObject: URL, danglingParams: string[]) {
  return pipe(
    O.Do,

    O.bind("originString", () =>
      pipe(
        urlObject.origin,
        O.fromPredicate((h) => h !== "")
      )
    ),

    O.map(({ originString }) =>
      pipe(
        danglingParams,
        O.fromPredicate((dp) => dp.length > 0),
        O.map(stringArrayJoin("&")),
        O.map((h) => originString + (urlObject.pathname || "") + "?" + h),
        O.getOrElse(() => originString + (urlObject.pathname || ""))
      )
    ),

    O.getOrElse(() => defaultRESTReq.endpoint)
  )
}
