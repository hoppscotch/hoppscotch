import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

import { z } from "zod"

const hoppEnvSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

export const hoppEnvImporter = (content: string) => {
  const parsedContent = safeParseJSON(content, true)

  // parse json from the environments string
  if (O.isNone(parsedContent)) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const validationResult = z.array(hoppEnvSchema).safeParse(parsedContent.value)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments = validationResult.data

  return TE.right(environments)
}
