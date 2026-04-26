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
      // Split only on the first "=" to preserve values that contain "=" signs
      const eqIndex = pair.indexOf("=")
      const key = eqIndex === -1 ? pair : pair.slice(0, eqIndex).trim()
      let value = eqIndex === -1 ? "" : pair.slice(eqIndex + 1)
      // Strip surrounding double-quotes from the value (e.g. "subprop1=val1" -> subprop1=val1)
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      return { ...acc, [key]: value }
    }, {})
}
