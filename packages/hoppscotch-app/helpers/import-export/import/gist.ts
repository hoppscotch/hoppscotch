import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { translateToNewRESTCollection } from "~/newstore/collections"

export default defineImporter({
  name: "import.gist",
  icon: "github",
  steps: [
    step({
      stepName: "URL_IMPORT",
      metadata: {
        placeholder: "import.gist_url",
      },
    }),
  ] as const,
  importer: ([content]) =>
    pipe(
      E.tryCatch(
        async () => {
          await fetch(
            `https://api.github.com/gists/${content.split("/").pop()}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            }
          ).then((files) => {
            debugger
            return JSON.parse(Object.values(files)[0].content).map(
              (coll: any) => translateToNewRESTCollection(coll)
            )
          })
        },
        () => IMPORTER_INVALID_FILE_FORMAT
      ),
      TE.fromEither
    ),
})
