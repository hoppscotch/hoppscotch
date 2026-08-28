import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { entityReference } from "verzod"

export const hoppGqlCollectionsImporter = (
  contents: string[]
): E.Either<"INVALID_JSON", HoppCollection[]> => {
  return E.tryCatch(
    () => {
      const parsedContents = contents.flatMap((content) => JSON.parse(content))

      const validationResult = entityReference(HoppCollection)
        .array()
        .safeParse(parsedContents)

      if (!validationResult.success) {
        throw new Error("Invalid Hoppscotch GQL collection")
      }

      return validationResult.data
    },
    () => "INVALID_JSON"
  )
}
