import * as E from "fp-ts/Either"

import { platform } from "~/platform"

/**
 * Create a downloadable file from a collection and prompts the user to download it.
 * @param collectionJSON - JSON string of the collection
 * @param name - Name of the collection set as the file name
 */
export const initializeDownloadFile = async (
  collectionJSON: string,
  name: string | null
) => {
  const result = await platform.io.saveFileWithDialog({
    data: collectionJSON,
    contentType: "application/json",
    suggestedFilename: `${name ?? "collection"}.json`,
    filters: [
      {
        name: "Hoppscotch Collection/Environment JSON file",
        extensions: ["json"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    return E.right("state.download_started")
  }

  return E.left("state.download_failed")
}
