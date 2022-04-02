import parser from "yargs-parser"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
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

/**
 * Converts the truthy value to method string
 * @param X Method string
 * @returns Option of method string
 */
const methodIs = (X: string) =>
  O.fold(
    () => O.none,
    () => O.some(X)
  )

const checkArgument =
  (...p: Array<(obj: object) => boolean>) =>
  (parsedArguments: parser.Arguments) =>
    pipe(
      p,
      A.map((pred) => O.fromPredicate(() => pred(parsedArguments))),
      A.filterMap((pred) => pred(parsedArguments)),
      O.fromPredicate((preds) => preds.length > 0)
    )

const getMethodByDeduction = (parsedArguments: parser.Arguments) =>
  pipe(
    parsedArguments,
    checkArgument(
      objHasProperty("T", "string"),
      objHasProperty("upload-file", "string")
    ),
    methodIs("put"),
    O.alt(() =>
      pipe(
        parsedArguments,
        checkArgument(
          objHasProperty("I", "boolean"),
          objHasProperty("head", "boolean")
        ),
        methodIs("head")
      )
    ),
    O.alt(() =>
      pipe(
        parsedArguments,
        checkArgument(objHasProperty("G", "boolean")),
        methodIs("get")
      )
    ),
    O.alt(() =>
      pipe(
        parsedArguments,
        checkArgument(
          objHasProperty("d", "string"),
          objHasArrayProperty("d", "string"),
          objHasProperty("F", "string"),
          objHasArrayProperty("F", "string")
        ),
        methodIs("post")
      )
    )
  )

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
