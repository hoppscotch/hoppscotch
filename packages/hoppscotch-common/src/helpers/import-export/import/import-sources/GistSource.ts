import axios from "axios"
import UrlImport from "~/components/importExport/ImportExportSteps/UrlImport.vue"
import { defineStep } from "~/composables/step-components"

import { v4 as uuidv4 } from "uuid"

export function GistSource(metadata: {
  caption: string
  onImportFromGist: (content: string) => any | Promise<any>
}) {
  const stepID = uuidv4()

  return defineStep(stepID, UrlImport, () => ({
    caption: metadata.caption,
    onImportFromGist: metadata.onImportFromGist,
    fetchLogic: fetchGistFromUrl,
  }))
}

const fetchGistFromUrl = (url: string) =>
  axios.get(`https://api.github.com/gists/${url.split("/").pop()}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  })
