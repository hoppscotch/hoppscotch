import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { entityReference } from "verzod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

import { Environment } from "@hoppscotch/data"
import { z } from "zod"

export const hoppEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSON(str))

  // check if any of the JSON parse results is None
  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.flatMap((parsed) => O.toNullable(parsed))

  const validationResult = z
    .array(entityReference(Environment))
    .safeParse(parsedValues)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments = validationResult.data

  return TE.right(environments)
}
