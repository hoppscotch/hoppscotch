import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as TO from "fp-ts/TaskOption"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import _isPlainObject from "lodash/isPlainObject"
import axios from "axios"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."

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
 * validates the collection and wraps it in an Option
 */
const validateCollectionSchema = (
  collection: unknown
): O.Option<HoppCollection<HoppRESTRequest>> =>
  isValidCollection(collection) ? O.some(collection) : O.none

/**
 * convert single collection object into an array so it can be handled the same as multiple collections
 */
const makeCollectionsArray = (collections: unknown | unknown[]): unknown[] =>
  Array.isArray(collections) ? collections : [collections]

/**
 * fetches and validates the hoppscotch collection json from the given url
 */
const fetchHoppCollectionFromUrl = (
  url: string
): TO.TaskOption<HoppCollection<HoppRESTRequest>[]> =>
  pipe(
    TO.tryCatch(() => axios.get(url)),
    TO.chain((res) =>
      pipe(
        res.data,
        makeCollectionsArray,
        O.traverseArray(validateCollectionSchema),
        O.map(RA.toArray),
        TO.fromOption
      )
    )
  )

export default defineImporter({
  name: "Import Hoppscotch Collection From URL",
  icon: "folder-plus",
  steps: [
    step({
      stepName: "URL_IMPORT",
      metadata: {
        caption: "Import collection from url",
        placeholder: "Enter url",
      },
    }),
  ],
  importer: ([url]) =>
    pipe(
      fetchHoppCollectionFromUrl(url),
      TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT)
    ),
})
