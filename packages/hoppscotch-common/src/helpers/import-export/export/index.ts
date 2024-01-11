import * as E from "fp-ts/Either"

/**
 * Create a downloadable file from a collection and prompts the user to download it.
 * @param collectionJSON - JSON string of the collection
 * @param name - Name of the collection set as the file name
 */
export const initializeDownloadCollection = (
  collectionJSON: string,
  name: string | null
) => {
  const file = new Blob([collectionJSON], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url

  if (name) {
    a.download = `${name}.json`
  } else {
    a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.json`
  }

  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)

  return E.right("state.download_started")
}
