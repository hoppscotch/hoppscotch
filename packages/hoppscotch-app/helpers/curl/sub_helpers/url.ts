import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import { stringArrayJoin } from "~/helpers/functional/array"

const defaultRESTReq = getDefaultRESTRequest()

/**
 * Processes URL string and returns the URL object
 * @param parsedArguments Parsed Arguments object
 * @returns URL object
 */
export function parseURL(parsedArguments: parser.Arguments) {
  return pipe(
    parsedArguments._[1],
    O.fromNullable,
    O.map((u) => u.toString().replace(/["']/g, "")),
    O.map((u) => u.trim()),
    O.chain((u) =>
      pipe(
        /^[^:\s]+(?=:\/\/)/.exec(u),
        O.fromNullable,
        O.map((p) => p[2]),
        O.match(
          // if protocol is not found
          () =>
            pipe(
              // get the base URL
              /^([^\s:@]+:[^\s:@]+@)?([^:/\s]+)([:]*)/.exec(u),
              O.fromNullable,
              O.map((burl) => burl[2]),
              O.map((burl) =>
                burl === "localhost" || burl === "127.0.0.1"
                  ? "http://" + u
                  : "https://" + u
              )
            ),
          (_) => O.some(u)
        )
      )
    ),
    O.map((u) => new URL(u)),
    O.getOrElse(() => {
      // no url found
      for (const argName in parsedArguments) {
        if (
          typeof parsedArguments[argName] === "string" &&
          ["http", "www."].includes(parsedArguments[argName])
        )
          return pipe(
            parsedArguments[argName],
            O.fromNullable,
            O.getOrElse(() => defaultRESTReq.endpoint),
            (u) => new URL(u)
          )
      }
      return new URL(defaultRESTReq.endpoint)
    })
  )
}

/**
 * Joins dangling params to origin
 * @param origin origin value from the URL Object
 * @param params params without values
 * @returns origin string concatenated with dngling paramas
 */
export function concatParams(urlObject: URL, params: string[]) {
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
        params,
        O.fromPredicate((dp) => dp.length > 0),
        O.map(stringArrayJoin("&")),
        O.map((h) => originString + (urlObject.pathname || "") + "?" + h),
        O.getOrElse(() => originString + (urlObject.pathname || ""))
      )
    ),

    O.getOrElse(() => defaultRESTReq.endpoint)
  )
}
