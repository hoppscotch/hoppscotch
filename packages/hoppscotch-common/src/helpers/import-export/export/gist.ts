import * as E from "fp-ts/Either"
import { createGist } from "~/helpers/gist"

export const gistExporter = async (
  JSONFileContents: string,
  accessToken: string,
  fileName = "hoppscotch-collections.json"
) => {
  if (!accessToken) {
    return E.left("Invalid User")
  }

  const res = await createGist(JSONFileContents, fileName, accessToken)()

  if (E.isLeft(res)) {
    return E.left(res.left)
  }
  return E.right(res.right.data.html_url as string)
}
