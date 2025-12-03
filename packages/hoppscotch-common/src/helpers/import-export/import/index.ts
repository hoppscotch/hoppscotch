import * as TE from "fp-ts/TaskEither"
import type { Component } from "vue"
import { StepsOutputList } from "../steps"
import {
  HoppCollection,
  makeCollection,
  translateToNewRESTCollection,
} from "@hoppscotch/data"

/**
 * A common error state to be used when the file formats are not expected
 */
export const IMPORTER_INVALID_FILE_FORMAT =
  "importer_invalid_file_format" as const

export type HoppImporterError = typeof IMPORTER_INVALID_FILE_FORMAT

type HoppImporter<T, StepsType, Errors> = (
  stepValues: StepsOutputList<StepsType>
) => TE.TaskEither<Errors, T>

type HoppImporterApplicableTo = Array<
  "team-collections" | "my-collections" | "url-import"
>

/**
 * Definition for importers
 */
type HoppImporterDefinition<T, Y, E> = {
  /**
   * the id
   */
  id: string
  /**
   * Name of the importer, shown on the Select Importer dropdown
   */
  name: string

  /**
   * Icon for importer button
   */
  icon: Component

  /**
   * Identifier for the importer
   */
  applicableTo: HoppImporterApplicableTo

  /**
   * The importer function, It is a Promise because its supposed to be loaded in lazily (dynamic imports ?)
   */
  importer: HoppImporter<T, Y, E>

  /**
   * The steps to fetch information required to run an importer
   */
  steps: Y
}

/**
 * Defines a Hoppscotch importer
 */
export const defineImporter = <ReturnType, StepType, Errors>(input: {
  id: string
  name: string
  icon: object | Component
  importer: HoppImporter<ReturnType, StepType, Errors>
  applicableTo: HoppImporterApplicableTo
  steps: StepType
}) => {
  return <HoppImporterDefinition<ReturnType, StepType, Errors>>{
    ...input,
  }
}

/**
 * Sanitize collection for import, removes old id and ref_id from collection and folders, and transforms it to
 * new collection format with a newly generated ref_id.
 * @param collection The collection to sanitize
 * @returns The sanitized collection with new ref_id
 */
export const sanitizeCollection = (
  collection: HoppCollection
): HoppCollection => {
  const {
    id: _id,
    _ref_id: _refId,
    v: _v,
    ...rest
  } = translateToNewRESTCollection(collection)

  return makeCollection({
    ...rest,
    folders: rest.folders.map(sanitizeCollection),
  })
}
