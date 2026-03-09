import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import {
  objHasArrayProperty,
  objHasProperty,
} from "~/helpers/functional/object"

/**
 * Parses cookies from curl arguments
 * Handles both -b flag and --cookie parameter
 */
export const getCookies = (parsedArguments: any): Record<string, string> => {
  // Handle -b or --cookie flags
  return pipe(
    parsedArguments,
    O.fromPredicate(objHasArrayProperty("b", "string")),
    O.map((args) => parseCookieStrings(args.b)),
    O.altW(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("b", "string")),
        O.map((args) => parseCookieString(args.b))
      )
    ),
    O.altW(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasArrayProperty("cookie", "string")),
        O.map((args) => parseCookieStrings(args.cookie))
      )
    ),
    O.altW(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("cookie", "string")),
        O.map((args) => parseCookieString(args.cookie))
      )
    ),
    O.getOrElseW(() => ({}))
  )
}

/**
 * Parse multiple cookie strings and combine them
 */
const parseCookieStrings = (cookies: string[]): Record<string, string> => {
  return cookies.reduce((acc, cookie) => {
    return { ...acc, ...parseCookieString(cookie) }
  }, {})
}

/**
 * Parse a single cookie string into a record
 */
const parseCookieString = (cookieString: string): Record<string, string> => {
  return cookieString
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, value] = pair.split("=", 2)
      return { ...acc, [key]: value || "" }
    }, {})
}
