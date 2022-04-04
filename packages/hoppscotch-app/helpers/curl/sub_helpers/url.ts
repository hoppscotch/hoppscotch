import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import { stringArrayJoin } from "~/helpers/functional/array"

const defaultRESTReq = getDefaultRESTRequest()

const getProtocolForBaseURL = (baseURL: string) =>
  pipe(
    // get the base URL
    /^([^\s:@]+:[^\s:@]+@)?([^:/\s]+)([:]*)/.exec(baseURL),
    O.fromNullable,
    O.filter((burl) => burl.length > 1),
    O.map((burl) => burl[2]),
    // set protocol to http for local URLs
    O.map((burl) =>
      burl === "localhost" || burl === "127.0.0.1"
        ? "http://" + baseURL
        : "https://" + baseURL
    )
  )

/**
 * Processes URL string and returns the URL object
 * @param parsedArguments Parsed Arguments object
 * @returns URL object
 */
export function parseURL(parsedArguments: parser.Arguments) {
  return pipe(
    // contains raw url string
    parsedArguments._[1],
    O.fromNullable,
    // preprocess url string
    O.map((u) => u.toString().replace(/["']/g, "").trim()),
    O.chain((u) =>
      pipe(
        // check if protocol is available
        /^[^:\s]+(?=:\/\/)/.exec(u),
        O.fromNullable,
        O.map((_) => u),
        O.alt(() => getProtocolForBaseURL(u))
      )
    ),
    O.map((u) => new URL(u)),
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
