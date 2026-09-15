import { HoppRESTAuth } from "@hoppscotch/data"
import parser from "yargs-parser"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { objHasProperty } from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

/**
 * Split a `username:password` credential on the FIRST colon only.
 * curl uses the first colon as the separator, so the password may itself
 * contain colons (e.g. tokens, base64); the username cannot.
 */
const splitOnFirstColon = (value: string): [string, string] => {
  const separatorIndex = value.indexOf(":")
  return separatorIndex === -1
    ? [value, ""]
    : [value.slice(0, separatorIndex), value.slice(separatorIndex + 1)]
}

const getAuthFromAuthHeader = (headers: Record<string, string>) =>
  pipe(
    headers.Authorization,
    O.fromNullable,
    O.map((a) => a.split(" ")),
    O.filter((a) => a.length > 1),
    O.chain((kv) =>
      O.fromNullable(
        (() => {
          switch (kv[0].toLowerCase()) {
            case "bearer":
              return <HoppRESTAuth>{
                authActive: true,
                authType: "bearer",
                token: kv[1],
              }
            case "basic": {
              const [username, password] = pipe(
                O.tryCatch(() => atob(kv[1])),
                // split on the first colon only — password may contain colons
                O.map(splitOnFirstColon),
                O.getOrElse(() => ["", ""] as [string, string])
              )

              if (!username) return undefined

              return <HoppRESTAuth>{
                authActive: true,
                authType: "basic",
                username,
                password: password ?? "",
              }
            }
            default:
              return undefined
          }
        })()
      )
    )
  )

const getAuthFromParsedArgs = (parsedArguments: parser.Arguments) =>
  pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("u", "string")),
    // split on the first colon only — password may contain colons
    O.map((args) => splitOnFirstColon(args.u)),
    // can have a username with no password
    O.filter(([username]) => username.length > 0),
    O.map(
      ([username, password]) =>
        <HoppRESTAuth>{
          authActive: true,
          authType: "basic",
          username,
          password,
        }
    )
  )

const getAuthFromURLObject = (urlObject: URL) =>
  pipe(
    urlObject,
    (url) => [url.username, url.password ?? ""],
    // can have a username with no password
    O.fromPredicate(([username]) => !!username && username.length > 0),
    O.map(
      ([username, password]) =>
        <HoppRESTAuth>{
          authActive: true,
          authType: "basic",
          username,
          password,
        }
    )
  )

/**
 * Preference order:
 *    - Auth headers
 *    - --user or -u argument
 *    - Creds provided along with URL
 */
export const getAuthObject = (
  parsedArguments: parser.Arguments,
  headers: Record<string, string>,
  urlObject: URL
): HoppRESTAuth =>
  pipe(
    getAuthFromAuthHeader(headers),
    O.alt(() => getAuthFromParsedArgs(parsedArguments)),
    O.alt(() => getAuthFromURLObject(urlObject)),
    O.getOrElse(() => defaultRESTReq.auth)
  )
