import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import { pipe, flow } from "fp-ts/function"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

import { Environment, translateToNewEnvironment } from "@hoppscotch/data"
import { isPlainObject as _isPlainObject } from "lodash-es"

const isPlainObject = (value: any): value is object => _isPlainObject(value)

/**
 * checks if a environment matches the schema for a hoppscotch environment.
 * here 1 is the latest version of the schema.
 */
const isValidEnvironment = (environment: unknown): environment is Environment =>
  isPlainObject(environment) && "v" in environment && environment.v === 1

/**
 * checks if a environment is a valid hoppscotch environment.
 * else translate it into one.
 */
const validateEnviroment = (env: unknown) => {
  if (isValidEnvironment(env)) {
    return O.some(env)
  }
  return O.some(translateToNewEnvironment(env))
}

/**
 * convert single environment object into an array so it can be handled the same as multiple environments
 */
const makeEnvironmentsArray = (environments: unknown | unknown[]): unknown[] =>
  Array.isArray(environments) ? environments : [environments]

export const hoppEnvImporter = (content: string) =>
  pipe(
    safeParseJSON(content),
    O.chain(
      flow(
        makeEnvironmentsArray,
        RA.map(validateEnviroment),
        O.sequenceArray,
        O.map(RA.toArray)
      )
    ),
    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )
