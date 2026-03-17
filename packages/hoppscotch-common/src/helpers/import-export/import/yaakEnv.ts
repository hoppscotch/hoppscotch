import { Environment, EnvironmentSchemaVersion } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { z } from "zod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { uniqueID } from "~/helpers/utils/uniqueID"

const yaakEnvSchema = z.object({
  resources: z.object({
    environments: z.array(
      z.object({
        name: z.string(),
        variables: z.array(
          z.object({
            name: z.string(),
            value: z.string(),
            enabled: z.boolean().optional(),
          })
        ),
      })
    ),
  }),
})

export const yaakEnvImporter = (contents: string[]) => {
  console.log("Yaak env importer started")

  const parsedContents = contents.map((str, index) => {
    console.log("Parsing file", index)
    return safeParseJSON(str, true)
  })

  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    console.error("JSON parsing failed")
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.flatMap((parsed) => {
    const json = O.toNullable(parsed)

    console.log("Raw parsed JSON", json)

    if (!json) return []

    // Handle array or object
    const files = Array.isArray(json) ? json : [json]

    return files.flatMap((file) => {
      const validation = yaakEnvSchema.safeParse(file)

      if (!validation.success) {
        console.error("Yaak schema validation failed", validation.error)
        return []
      }

      const envs = validation.data.resources.environments

      console.log("Environments found:", envs.length)

      return envs.map((env) => ({
        name: env.name,
        variables: env.variables.map((v) => ({
          key: v.name,
          value: String(v.value),
        })),
      }))
    })
  })

  console.log("Converted environments:", parsedValues)

  const environments: Environment[] = parsedValues.map(
    ({ name, variables }) => ({
      id: uniqueID(),
      v: EnvironmentSchemaVersion,
      name,
      variables: variables.map(({ key, value }) => ({
        key,
        initialValue: value,
        currentValue: value,
        secret: false,
      })),
    })
  )

  console.log("Final Hoppscotch environments:", environments)

  return TE.right(environments)
}
