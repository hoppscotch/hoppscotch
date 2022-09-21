import parser from "yargs-parser"
import * as cookie from "cookie"
import * as O from "fp-ts/Option"
import * as S from "fp-ts/string"
import { pipe, flow } from "fp-ts/function"
import { objHasProperty } from "~/helpers/functional/object"

export function getCookies(parsedArguments: parser.Arguments) {
  return pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("cookie", "string")),

    O.map((args) => args.cookie),

    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("b", "string")),
        O.map((args) => args.b)
      )
    ),

    O.map(flow(S.replace(/^cookie: /i, ""), cookie.parse)),

    O.getOrElse(() => ({}))
  )
}
