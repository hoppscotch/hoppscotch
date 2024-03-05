import axios from "axios"
import UrlImport from "~/components/importExport/ImportExportSteps/UrlImport.vue"
import { defineStep } from "~/composables/step-components"

import * as E from "fp-ts/Either"
import { z } from "zod"

import { v4 as uuidv4 } from "uuid"

export function GistSource(metadata: {
  caption: string
  onImportFromGist: (
    importResult: E.Either<string, string[]>
  ) => any | Promise<any>
}) {
  const stepID = uuidv4()

  return defineStep(stepID, UrlImport, () => ({
    caption: metadata.caption,
    onImportFromURL: (gistResponse: Record<string, unknown>) => {
      const fileSchema = z.object({
        files: z.record(z.object({ content: z.string() })),
      })

      const parseResult = fileSchema.safeParse(gistResponse)

      if (!parseResult.success) {
        metadata.onImportFromGist(E.left("INVALID_GIST"))
        return
      }

      const contents = Object.values(parseResult.data.files).map(
        ({ content }) => content
      )

      metadata.onImportFromGist(E.right(contents))
    },
    fetchLogic: fetchGistFromUrl,
  }))
}

const fetchGistFromUrl = (url: string) =>
  axios.get(`https://api.github.com/gists/${url.split("/").pop()}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  })
