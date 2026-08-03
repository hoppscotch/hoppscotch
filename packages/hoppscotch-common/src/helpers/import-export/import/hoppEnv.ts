import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { entityReference } from "verzod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

import { Environment } from "@hoppscotch/data"
import { z } from "zod"

export const hoppEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSON(str, true))

  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.flatMap((content) => {
    const unwrappedContent = O.toNullable(content) as Environment[] | null

    if (unwrappedContent) {
      return unwrappedContent.map((contentEntry) => {
        return {
          ...contentEntry,
          variables: contentEntry.variables?.map((valueEntry) => {
            if ("value" in valueEntry) {
              return {
                ...valueEntry,
                value: String(valueEntry.value),
              }
            }

            if ("initialValue" in valueEntry) {
              return {
                ...valueEntry,
                initialValue: String(valueEntry.initialValue),
              }
            }

            return valueEntry
          }),
        }
      })
    }
    return null
  })

  const validationResult = z
    .array(entityReference(Environment))
    .safeParse(parsedValues)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments = validationResult.data

  return TE.right(environments)
}
