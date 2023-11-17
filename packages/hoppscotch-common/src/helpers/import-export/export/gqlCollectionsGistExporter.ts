import * as E from "fp-ts/Either"
import { createGist } from "~/helpers/gist"

export const gqlCollectionsGistExporter = async (
  gqlCollectionsJSON: string,
  accessToken: string
) => {
  const res = await createGist(
    gqlCollectionsJSON,
    "hoppscotch-collections.json",
    accessToken
  )()

  if (E.isLeft(res)) {
    return E.left(res.left)
  }
  return E.right(res.right.data.html_url as string)
}
