import * as TE from "fp-ts/TaskEither"
import { HoppRESTRequest } from "@hoppscotch/data"
import { Collection } from "~/newstore/collections"

/**
 * The error state to be used when the file formats do not match
 */
export const IMPORTER_INVALID_FILE_FORMAT =
  "importer_invalid_file_format" as const

export type HoppImporterError = typeof IMPORTER_INVALID_FILE_FORMAT

export type HoppImporter<T> = (
  content: string
) => TE.TaskEither<HoppImporterError, T>

/**
 * Definition for importers
 */
export type HoppImporterDefintion<T> = {
  /**
   * Name of the importer, shown on the Select Importer dropdown
   */
  name: string

  /**
   * The importer function, It is a Promise because its supposed to be loaded in lazily (dynamic imports ?)
   */
  importer: () => Promise<HoppImporter<T>>
}

export const RESTCollectionImporters: HoppImporterDefintion<
  Collection<HoppRESTRequest>[]
>[] = [
  {
    name: "Hoppscotch REST Collection",
    importer: () => import("./hopp").then((m) => m.default),
  },
]
