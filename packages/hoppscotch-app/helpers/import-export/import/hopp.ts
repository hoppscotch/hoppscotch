import { HoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { HoppImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import {
  Collection,
  translateToNewRESTCollection,
} from "~/newstore/collections"

const importer: HoppImporter<Collection<HoppRESTRequest>[]> = (content) =>
  pipe(
    E.tryCatch(
      () =>
        JSON.parse(content).map((coll: any) =>
          translateToNewRESTCollection(coll)
        ),
      () => IMPORTER_INVALID_FILE_FORMAT
    ),
    TE.fromEither
  )

export default importer
