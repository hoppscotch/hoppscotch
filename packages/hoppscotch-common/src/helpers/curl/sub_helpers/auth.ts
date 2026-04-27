import { HoppRESTAuth } from "@hoppscotch/data"
import parser from "yargs-parser"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
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
              // RFC 7617: credentials are base64(username ":" password).
              // The password itself may contain colons, so only split on the
              // first colon and rejoin the remainder as the password.
              const [username, password] = pipe(
                O.tryCatch(() => atob(kv[1])),
                O.map((decoded) => {
                  const idx = decoded.indexOf(":")
                  if (idx === -1) return <[string, string]>[decoded, ""]
                  return <[string, string]>[
                    decoded.slice(0, idx),
                    decoded.slice(idx + 1),
                  ]
                }),
                O.getOrElse<[string, string]>(() => ["", ""])
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
        // curl -u supports "username:password" where password may contain colons,
        // so only split on the first colon.
        args.u as string,
        (userStr: string): O.Option<[string, string]> => {
          const idx = userStr.indexOf(":")
          if (idx === -1) {
            // Username only, no password
            return userStr.length > 0
              ? O.some([userStr, ""])
              : O.none
          }
          const username = userStr.slice(0, idx)
          const password = userStr.slice(idx + 1)
          return username.length > 0 ? O.some([username, password]) : O.none
        }
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
