import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { entityReference } from "verzod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

import { Environment } from "@hoppscotch/data"
import { z } from "zod"

export const hoppEnvImporter = (content: string) => {
  const parsedContent = safeParseJSON(content, true)

  // parse json from the environments string
  if (O.isNone(parsedContent)) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const validationResult = z
    .array(entityReference(Environment))
    .safeParse(parsedContent.value)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments = validationResult.data

  return TE.right(environments)
}
