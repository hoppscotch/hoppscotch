import axios from "axios"
import * as TE from "fp-ts/TaskEither"

export const createGist = (
  content: string,
  filename: string,
  accessToken: string
) => {
  return TE.tryCatch(
    async () =>
      axios.post(
        "https://api.github.com/gists",
        {
          files: {
            [filename]: {
              content: content,
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
