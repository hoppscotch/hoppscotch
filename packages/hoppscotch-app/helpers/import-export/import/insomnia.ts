import * as TE from "fp-ts/TaskEither"
import { HoppRESTRequest } from "@hoppscotch/data"
import { step } from "../steps"
import { parsePostmanCollection } from "./postman"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { parseInsomniaCollection } from "~/helpers/utils/parseInsomniaCollection"
import { Collection } from "~/newstore/collections"

// This Importer definition is less than ideal,
// would love an attempt at refactoring this

export default defineImporter({
  name: "Insomnia Collection",
  steps: [
    step({
      stepName: "FILE_OR_URL_IMPORT",
      metadata: {
        acceptedFileTypes: ".json",
      },
    }),
  ] as const,
  importer: ([fileContent]) => {
    try {
      let collections = parseInsomniaCollection(fileContent)
      const content = JSON.stringify(collections)

      if (collections[0]) {
        const [name, folders, requests] = Object.keys(collections[0])
        if (
          name === "name" &&
          folders === "folders" &&
          requests === "requests"
        ) {
          return TE.right(collections as Collection<HoppRESTRequest>[])
        }

        return TE.left(IMPORTER_INVALID_FILE_FORMAT)
      } else if (
        collections.info &&
        collections.info.schema.includes("v2.1.0")
      ) {
        // replace the variables, postman uses {{var}}, Hoppscotch uses <<var>>
        collections = JSON.parse(content.replaceAll(/{{([a-z]+)}}/gi, "<<$1>>"))
        collections = [parsePostmanCollection(collections)]

        return TE.right(collections as Collection<HoppRESTRequest>[])
      } else {
        return TE.left(IMPORTER_INVALID_FILE_FORMAT)
      }
    } catch (_e) {
      return TE.left(IMPORTER_INVALID_FILE_FORMAT)
    }
  },
})
