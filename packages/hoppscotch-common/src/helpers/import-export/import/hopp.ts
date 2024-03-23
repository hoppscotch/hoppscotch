import {
  HoppCollection,
  HoppRESTRequest,
  getDefaultGQLRequest,
  getDefaultRESTRequest,
  translateToNewRESTCollection,
} from "@hoppscotch/data"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import * as TE from "fp-ts/TaskEither"
import { flow, pipe } from "fp-ts/function"

import { HoppGQLRequest, translateToNewGQLCollection } from "@hoppscotch/data"
import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

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
  const collectionSchemaParsedResult = HoppCollection.safeParse(collection)

  if (collectionSchemaParsedResult.type === "ok") {
    const requests = collectionSchemaParsedResult.value.requests.map(
      (request) => {
        const requestSchemaParsedResult = HoppRESTRequest.safeParse(request)

        return requestSchemaParsedResult.type === "ok"
          ? requestSchemaParsedResult.value
          : getDefaultRESTRequest()
      }
    )

    return O.some({
      ...collectionSchemaParsedResult.value,
      requests,
    })
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
  const collectionSchemaParsedResult = HoppCollection.safeParse(collection)

  if (collectionSchemaParsedResult.type === "ok") {
    const requests = collectionSchemaParsedResult.value.requests.map(
      (request) => {
        const requestSchemaParsedResult = HoppGQLRequest.safeParse(request)

        return requestSchemaParsedResult.type === "ok"
          ? requestSchemaParsedResult.value
          : getDefaultGQLRequest()
      }
    )

    return O.some({
      ...collectionSchemaParsedResult.value,
      requests,
    })
  }

  return O.some(translateToNewGQLCollection(collection))
}
