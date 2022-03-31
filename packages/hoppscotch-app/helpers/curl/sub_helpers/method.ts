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

const getMethodFromXArg = (xarg: string) =>
  pipe(
    xarg.match(/GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE/i),
    O.fromNullable,
    O.alt(() => O.fromNullable(xarg.match(/[a-zA-Z]+/)))
  )

const isMethod = (X: string) =>
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
    isMethod("put"),
    O.alt(() =>
      pipe(
        parsedArguments,
        checkArgument(
          objHasProperty("I", "boolean"),
          objHasProperty("head", "boolean")
        ),
        isMethod("head")
      )
    ),
    O.alt(() =>
      pipe(
        parsedArguments,
        checkArgument(objHasProperty("G", "boolean")),
        isMethod("get")
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
        isMethod("post")
      )
    )
  )

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
    O.chain(getMethodFromXArg),
    O.map((method) => method[0]),
    O.alt(() => getMethodByDeduction(parsedArguments)),
    O.getOrElse(() => defaultRESTReq.method)
  )
