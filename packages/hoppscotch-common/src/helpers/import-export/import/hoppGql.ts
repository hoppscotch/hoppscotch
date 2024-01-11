import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"

// TODO: add zod validation
export const hoppGqlCollectionsImporter = (
  content: string
): E.Either<"INVALID_JSON", HoppCollection[]> => {
  return E.tryCatch(
    () => JSON.parse(content) as HoppCollection[],
    () => "INVALID_JSON"
  )
}
