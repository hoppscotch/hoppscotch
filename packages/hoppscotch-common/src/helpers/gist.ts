import axios from "axios"
import * as TE from "fp-ts/TaskEither"

/**
 * Create an gist on GitHub with the collection JSON
 * @param collectionJSON - JSON string of the collection
 * @param accessToken - GitHub access token
 * @returns Either of the response of the GitHub Gist API or the error
 */
export const createCollectionGists = (
  collectionJSON: string,
  accessToken: string
) => {
  return TE.tryCatch(
    async () =>
      axios.post(
        "https://api.github.com/gists",
        {
          files: {
            "hoppscotch-collections.json": {
              content: collectionJSON,
            },
          },
        },
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      ),
    (reason) => reason
  )
}
