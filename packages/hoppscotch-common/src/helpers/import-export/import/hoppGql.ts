import { HoppCollection } from "@hoppscotch/data"
import * as A from "fp-ts/Array"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { flow, pipe } from "fp-ts/function"
import { safeParseJSON } from "~/helpers/functional/json"

export const hoppGqlCollectionsImporter = (
  contents: string[]
): E.Either<"INVALID_JSON", HoppCollection[]> => {
  return pipe(
    contents,
    A.traverse(O.Applicative)((str) => safeParseJSON(str, true)),
    O.chain(
      flow(
        A.flatten,
        A.traverse(O.Applicative)((coll) => {
          const parsed = HoppCollection.safeParse(coll)
          return parsed.type === "ok" ? O.some(parsed.value) : O.none
        })
      )
    ),
    E.fromOption(() => "INVALID_JSON")
  )
}
