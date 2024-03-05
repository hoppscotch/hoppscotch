import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"

// TODO: add zod validation
export const hoppGqlCollectionsImporter = (
  contents: string[]
): E.Either<"INVALID_JSON", HoppCollection[]> => {
  return E.tryCatch(
    () => contents.flatMap((content) => JSON.parse(content)),
    () => "INVALID_JSON"
  )
}
