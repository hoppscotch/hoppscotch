import * as TE from "fp-ts/TaskEither"
import * as A from "fp-ts/Array"
import { pipe } from "fp-ts/function"
import { step } from "../steps"
import { defineImporter } from "."
import { getRESTCollection } from "~/newstore/collections"

export default defineImporter({
  name: "import.from_my_collections",
  icon: "user",
  applicableTo: ["team-collections"],
  steps: [
    step({
      stepName: "TARGET_MY_COLLECTION",
      metadata: {
        caption: "import.from_my_collections_description",
      },
    }),
  ] as const,
  importer: ([content]) => pipe(content, getRESTCollection, A.of, TE.of),
})
