import { createGist } from "~/helpers/gist"
import * as E from "fp-ts/Either"

export const collectionsGistExporter = async (
  collectionJSON: string,
  accessToken: string
) => {
  if (!accessToken) {
    return E.left("Invalid User")
  }

  const res = await createGist(
    collectionJSON,
    "hoppscotch-collections.json",
    accessToken
  )()

  if (E.isLeft(res)) {
    return E.left(res.left)
  }
  return E.right(true)
}
