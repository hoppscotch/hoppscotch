import * as E from "fp-ts/Either"
import { platform } from "~/platform"

/**
 * Create a downloadable file from a collection/environment and prompts the user to download it.
 * @param contentsJSON - JSON string of the collection
 * @param name - Name of the collection set as the file name
 * @returns {Promise<E.Right<string> | E.Left<string>>} - Returns a promise that resolves to an `Either` with `i18n` key for the status message
 */
export const initializeDownloadFile = async (
  contentsJSON: string,
  name: string | null
) => {
  const result = await platform.io.saveFileWithDialog({
    data: contentsJSON,
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

/**
 * JSON replacer to remove `_ref_id` from the exported JSON
 */
export const stripRefIdReplacer = (key: string, value: any) => {
  return key === "_ref_id" ? undefined : value
}
