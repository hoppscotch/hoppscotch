import { HoppRESTAuth } from "@hoppscotch/data"
import parser from "yargs-parser"
import * as O from "fp-ts/Option"
import * as S from "fp-ts/string"
import { pipe } from "fp-ts/function"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import { objHasProperty } from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

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
                O.map(S.split(":")),
                // can have a username with no password
                O.filter((arr) => arr.length > 0),
                O.map(
                  ([username, password]) =>
                    <[string, string]>[username, password]
                ),
                O.getOrElse(() => ["", ""])
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
    O.chain((args) =>
      pipe(
        args.u,
        S.split(":"),
        // can have a username with no password
        O.fromPredicate((arr) => arr.length > 0 && arr[0].length > 0),
        O.map(
          ([username, password]) => <[string, string]>[username, password ?? ""]
        )
      )
    ),
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
