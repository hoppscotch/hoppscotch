import { Environment } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { uniqueId } from "lodash-es"
import { z } from "zod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

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

  const validationResult = z
    .array(postmanEnvSchema)
    .safeParse(parsedContent.value)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  // Convert `values` to `variables` to match the format expected by the system
  const environments: Environment[] = validationResult.data.map(
    ({ name, values }) => ({
      id: uniqueId(),
      v: 1,
      name,
      variables: values.map((entires) => ({ ...entires, secret: false })),
    })
  )

  return TE.right(environments)
}
