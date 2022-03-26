import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import {
  objHasProperty,
  arrayObjHasProperty,
} from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

/**
 * Get method type from X argument in curl string or
 * find it out through presence of other arguments
 * @param parsedArguments Parsed Arguments object
 * @returns Method type
 */
export const getMethod = (parsedArguments: parser.Arguments): string =>
  pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("X", "string")),
    O.map((args) => args.X.trim()),
    O.chain((xarg) =>
      pipe(
        xarg.match(/GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE/i),
        O.fromNullable,
        O.alt(() => O.fromNullable(xarg.match(/[a-zA-Z]+/)))
      )
    ),
    O.match(
      () => {
        if (
          objHasProperty("T", "string")(parsedArguments) ||
          objHasProperty("upload-file", "string")(parsedArguments)
        )
          return "put"
        else if (
          objHasProperty("I", "boolean")(parsedArguments) ||
          objHasProperty("head", "boolean")(parsedArguments)
        )
          return "head"
        else if (objHasProperty("G", "boolean")(parsedArguments)) return "get"
        else if (
          objHasProperty("d", "string")(parsedArguments) ||
          arrayObjHasProperty("d", "string")(parsedArguments) ||
          objHasProperty("F", "string")(parsedArguments) ||
          arrayObjHasProperty("F", "string")(parsedArguments)
        )
          return "post"
        else return defaultRESTReq.method
      },
      (method) => method[0]
    )
  )
