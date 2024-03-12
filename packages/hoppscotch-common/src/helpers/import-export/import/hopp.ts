import { pipe, flow } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import * as A from "fp-ts/Array"
import { translateToNewRESTCollection, HoppCollection } from "@hoppscotch/data"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"
import { translateToNewGQLCollection } from "@hoppscotch/data"
import { entityReference } from "verzod"
import { z } from "zod"

export const hoppRESTImporter = (content: string[]) =>
  pipe(
    content,
    A.traverse(O.Applicative)((str) => safeParseJSON(str, true)),
    O.chain(
      flow(
        A.flatten,
        makeCollectionsArray,
        RA.map(validateCollection),
        O.sequenceArray,
        O.map(RA.toArray)
      )
    ),
    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )

/**
 * checks if a collection is a valid hoppscotch collection.
 * else translate it into one.
 */
const validateCollection = (collection: unknown) => {
  const result = entityReference(HoppCollection).safeParse(collection)
  if (result.success) return O.some(result.data)

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
  const result = z.array(entityReference(HoppCollection)).safeParse(collection)

  if (result.success) return O.some(result.data)

  return O.some(translateToNewGQLCollection(collection))
}
