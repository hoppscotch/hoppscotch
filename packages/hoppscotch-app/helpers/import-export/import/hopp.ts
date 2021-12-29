import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { translateToNewRESTCollection } from "~/newstore/collections"

export default defineImporter({
  name: "Hoppscotch REST Collection",
  steps: [
    step({
      stepName: "FILE_OR_URL_IMPORT",
      metadata: {
        acceptedFileTypes: "application/json",
      },
    }),
  ] as const,
  importer: ([content]) =>
    pipe(
      E.tryCatch(
        () =>
          JSON.parse(content).map((coll: any) =>
            translateToNewRESTCollection(coll)
          ),
        () => IMPORTER_INVALID_FILE_FORMAT
      ),
      TE.fromEither
    ),
})
