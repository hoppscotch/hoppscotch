import * as TE from "fp-ts/TaskEither"
import { StepsOutputList } from "../steps"

/**
 * A common error state to be used when the file formats are not expected
 */
export const IMPORTER_INVALID_FILE_FORMAT =
  "importer_invalid_file_format" as const

export type HoppImporterError = typeof IMPORTER_INVALID_FILE_FORMAT

type HoppImporter<T, StepsType, Errors> = (
  stepValues: StepsOutputList<StepsType>
) => TE.TaskEither<Errors, T>

/**
 * Definition for importers
 */
type HoppImporterDefinition<T, Y, E> = {
  /**
   * Name of the importer, shown on the Select Importer dropdown
   */
  name: string

  /**
   * Icon for importer button
   */
  icon: string

  /**
   * Identifier for the importer
   */
  applicableTo?: Array<"team-collections" | "my-collections">

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
  name: string
  icon: string
  importer: HoppImporter<ReturnType, StepType, Errors>
  applicableTo?: Array<"team-collections" | "my-collections">
  steps: StepType
}) => {
  return <HoppImporterDefinition<ReturnType, StepType, Errors>>{
    ...input,
  }
}
