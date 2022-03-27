import { HoppRESTAuth } from "@hoppscotch/data"
import parser from "yargs-parser"
import * as O from "fp-ts/Option"
import * as S from "fp-ts/string"
import { pipe } from "fp-ts/function"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import { objHasProperty } from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

/**
 * Preference order:
 *    - Auth headers
 *    - --user arg
 *    - Creds provided along with URL
 */
export const getAuthObject = (
  parsedArguments: parser.Arguments,
  headers: Record<string, string>,
  urlObject: URL
): HoppRESTAuth =>
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
                O.filter((arr) => arr.length === 2),
                O.map(
                  ([username, password]) =>
                    <[string, string]>[username, password]
                ),

                O.getOrElse(() => ["", ""])
              )

              if (!username || !password) return undefined

              return <HoppRESTAuth>{
                authActive: true,
                authType: "basic",
                username,
                password,
              }
            }
            default:
              return undefined
          }
        })()
      )
    ),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("u", "string")),
        O.map((args) =>
          pipe(
            args.u,
            S.split(":"),
            ([username, password]) => <[string, string]>[username, password]
          )
        ),
        O.alt(() =>
          pipe(urlObject, (url) => [url.username, url.password], O.of)
        ),
        O.filter(
          ([username, password]) => username.length > 0 && password.length > 0
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
    ),
    O.getOrElse(() => defaultRESTReq.auth)
  )
