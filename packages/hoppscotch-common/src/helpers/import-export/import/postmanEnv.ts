import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

import { z } from "zod"
import { Environment } from "@hoppscotch/data"

const postmanEnvSchema = z.object({
  name: z.string(),
  values: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

export const postmanEnvImporter = (content: string) => {
  const parsedContent = safeParseJSON(content)

  // parse json from the environments string
  if (O.isNone(parsedContent)) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const validationResult = postmanEnvSchema.safeParse(parsedContent.value)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const postmanEnv = validationResult.data

  const environment: Environment = {
    name: postmanEnv.name,
    variables: [],
  }

  postmanEnv.values.forEach(({ key, value }) =>
    environment.variables.push({ key, value })
  )

  return TE.right(environment)
}
