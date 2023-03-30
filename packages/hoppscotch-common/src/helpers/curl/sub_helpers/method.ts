import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as R from "fp-ts/Refinement"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import {
  objHasProperty,
  objHasArrayProperty,
} from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

const getMethodFromXArg = (parsedArguments: parser.Arguments) =>
  pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("X", "string")),
    O.map((args) => args.X.trim()),
    O.chain((xarg) =>
      pipe(
        O.fromNullable(
          xarg.match(/GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE/i)
        ),
        O.alt(() => O.fromNullable(xarg.match(/[a-zA-Z]+/)))
      )
    ),
    O.map((method) => method[0])
  )

const getMethodByDeduction = (parsedArguments: parser.Arguments) => {
  if (
    pipe(
      objHasProperty("T", "string"),
      R.or(objHasProperty("upload-file", "string"))
    )(parsedArguments)
  )
    return O.some("put")
  else if (
    pipe(
      objHasProperty("I", "boolean"),
      R.or(objHasProperty("head", "boolean"))
    )(parsedArguments)
  )
    return O.some("head")
  else if (objHasProperty("G", "boolean")(parsedArguments)) return O.some("get")
  else if (
    pipe(
      objHasProperty("d", "string"),
      R.or(objHasArrayProperty("d", "string")),
      R.or(objHasProperty("F", "string")),
      R.or(objHasArrayProperty("F", "string"))
    )(parsedArguments)
  )
    return O.some("POST")
  else return O.none
}

/**
 * Get method type from X argument in curl string or
 * find it out through other arguments
 * @param parsedArguments Parsed Arguments object
 * @returns Method string
 */
export const getMethod = (parsedArguments: parser.Arguments): string =>
  pipe(
    getMethodFromXArg(parsedArguments),
    O.alt(() => getMethodByDeduction(parsedArguments)),
    O.getOrElse(() => defaultRESTReq.method)
  )
