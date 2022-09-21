import IconGithub from "~icons/lucide/github"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as TO from "fp-ts/TaskOption"
import * as O from "fp-ts/Option"
import axios from "axios"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."

// TODO: Add validation to output
const fetchGist = (
  url: string
): TO.TaskOption<HoppCollection<HoppRESTRequest>[]> =>
  pipe(
    TO.tryCatch(() =>
      axios.get(`https://api.github.com/gists/${url.split("/").pop()}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      })
    ),
    TO.chain((res) =>
      pipe(
        O.tryCatch(() =>
          JSON.parse((Object.values(res.data.files)[0] as any).content)
        ),
        TO.fromOption
      )
    )
  )

export default defineImporter({
  id: "gist",
  name: "import.from_gist",
  icon: IconGithub,
  applicableTo: ["my-collections", "team-collections"],
  steps: [
    step({
      stepName: "URL_IMPORT",
      metadata: {
        caption: "import.from_gist_description",
        placeholder: "import.gist_url",
      },
    }),
  ] as const,
  importer: ([content]) =>
    pipe(
      fetchGist(content),
      TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT)
    ),
})
