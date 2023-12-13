import { pipe, flow } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import { translateToNewRESTCollection, HoppCollection } from "@hoppscotch/data"
import { isPlainObject as _isPlainObject } from "lodash-es"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"
import { translateToNewGQLCollection } from "@hoppscotch/data"

export const hoppRESTImporter = (content: string) =>
  pipe(
    safeParseJSON(content),
    O.chain(
      flow(
        makeCollectionsArray,
        RA.map(validateCollection),
        O.sequenceArray,
        O.map(RA.toArray)
      )
    ),
    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )

/**
 * checks if a value is a plain object
 */
const isPlainObject = (value: any): value is object => _isPlainObject(value)

/**
 * checks if a collection matches the schema for a hoppscotch collection.
 * here 2 is the latest version of the schema.
 */
const isValidCollection = (collection: unknown): collection is HoppCollection =>
  isPlainObject(collection) && "v" in collection && collection.v === 2

/**
 * checks if a collection is a valid hoppscotch collection.
 * else translate it into one.
 */
const validateCollection = (collection: unknown) => {
  if (isValidCollection(collection)) {
    return O.some(collection)
  }
  return O.some(translateToNewRESTCollection(collection))
}

/**
 * convert single collection object into an array so it can be handled the same as multiple collections
 */
const makeCollectionsArray = (collections: unknown | unknown[]): unknown[] =>
  Array.isArray(collections) ? collections : [collections]

export const hoppGQLImporter = (content: string) =>
  pipe(
    safeParseJSON(content),
    O.chain(
      flow(
        makeCollectionsArray,
        RA.map(validateGQLCollection),
        O.sequenceArray,
        O.map(RA.toArray)
      )
    ),
    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )

/**
 *
 * @param collection the collection to validate
 * @returns the collection if it is valid, else a translated version of the collection
 */
export const validateGQLCollection = (collection: unknown) => {
  if (isValidCollection(collection)) {
    return O.some(collection)
  }
  return O.some(translateToNewGQLCollection(collection))
}
