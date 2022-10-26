import IconFolderPlus from "~icons/lucide/folder-plus"
import { pipe, flow } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import {
  translateToNewRESTCollection,
  HoppCollection,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { isPlainObject as _isPlainObject } from "lodash-es"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

export default defineImporter({
  id: "hoppscotch",
  name: "import.from_json",
  icon: IconFolderPlus,
  applicableTo: ["my-collections", "team-collections", "url-import"],
  steps: [
    step({
      stepName: "FILE_IMPORT",
      metadata: {
        caption: "import.from_json_description",
        acceptedFileTypes: "application/json",
      },
    }),
  ] as const,
  importer: ([content]) =>
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
    ),
})

/**
 * checks if a value is a plain object
 */
const isPlainObject = (value: any): value is object => _isPlainObject(value)

/**
 * checks if a collection matches the schema for a hoppscotch collection.
 * as of now we are only checking if the collection has a "v" key in it.
 */
const isValidCollection = (
  collection: unknown
): collection is HoppCollection<HoppRESTRequest> =>
  isPlainObject(collection) && "v" in collection

/**
 * checks if a collection is a valid hoppscotch collection.
 * else translate it into one.
 */
const validateCollection = (collection: unknown) => {
  if (isValidCollection(collection)) {
    return O.some(collection)
  } else {
    return O.some(translateToNewRESTCollection(collection))
  }
}

/**
 * convert single collection object into an array so it can be handled the same as multiple collections
 */
const makeCollectionsArray = (collections: unknown | unknown[]): unknown[] =>
  Array.isArray(collections) ? collections : [collections]
