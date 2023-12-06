import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"

// TODO: add zod validation
export const hoppGqlCollectionsImporter = (
  content: string
): E.Either<"INVALID_JSON", HoppCollection<HoppGQLRequest>[]> => {
  return E.tryCatch(
    () => JSON.parse(content) as HoppCollection<HoppGQLRequest>[],
    () => "INVALID_JSON"
  )
}
