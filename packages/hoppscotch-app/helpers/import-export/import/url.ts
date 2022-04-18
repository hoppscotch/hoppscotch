import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as TO from "fp-ts/TaskOption"
import axios from "axios"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."

const fetchHoppCollectionFromUrl = (
  url: string
): TO.TaskOption<HoppCollection<HoppRESTRequest>> =>
  pipe(
    TO.tryCatch(() => axios.get(url)),
    TO.chain((res) => pipe(res.data, TO.some))
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
