import * as E from "fp-ts/Either"

export const jsonToBlob = (content: object) =>
  E.tryCatch(
    () =>
      new Blob([JSON.stringify(content)], {
        type: "application/json",
      }),
    () => "CANNOT_MAKE_BLOB" as const
  )
