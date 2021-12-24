import * as TE from "fp-ts/TaskEither"
import { StepsOutputList } from "../steps"
import HoppRESTCollImporter from "../import/hopp"

/**
 * The error state to be used when the file formats do not match
 */
export const IMPORTER_INVALID_FILE_FORMAT =
  "importer_invalid_file_format" as const

export type HoppImporterError = typeof IMPORTER_INVALID_FILE_FORMAT

type HoppImporter<T, StepsType> = (
  stepValues: StepsOutputList<StepsType>
) => TE.TaskEither<HoppImporterError, T>

/**
 * Definition for importers
 */
type HoppImporterDefintion<T, Y> = {
  /**
   * Name of the importer, shown on the Select Importer dropdown
   */
  name: string

  /**
   * The importer function, It is a Promise because its supposed to be loaded in lazily (dynamic imports ?)
   */
  importer: HoppImporter<T, Y>

  /**
   * The steps to fetch information required to run an importer
   */
  steps: Y
}

/**
 * Defines a Hoppscotch importer
 */
export const defineImporter = <ReturnType, StepType>(input: {
  name: string
  importer: HoppImporter<ReturnType, StepType>
  steps: StepType
}) => {
  return <HoppImporterDefintion<ReturnType, StepType>>{
    ...input,
  }
}

export const RESTCollectionImporters = [HoppRESTCollImporter] as const
