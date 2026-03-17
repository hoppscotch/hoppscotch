import { EnvironmentSchemaVersion } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { z } from "zod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { uniqueID } from "~/helpers/utils/uniqueID"

const yaakEnvSchema = z.object({
  yaakVersion: z.string(),
  yaakSchema: z.number(),
  resources: z.object({
    environments: z
      .array(
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
      )
      .optional()
      .default([]),
  }),
})

type YaakEnvFile = z.infer<typeof yaakEnvSchema>

export const yaakEnvImporter = (contents: string[]) =>
  pipe(
    contents,

    // Parse JSON safely
    A.traverse(O.Applicative)((content) =>
      pipe(
        safeParseJSON(content),

        // Validate schema
        O.chain((json) => {
          const files = Array.isArray(json) ? json : [json]

          const parsed = files.map((file) => yaakEnvSchema.safeParse(file))

          if (parsed.some((p) => !p.success)) {
            return O.none
          }

          return O.of(
            parsed.map((p) => (p as z.SafeParseSuccess<YaakEnvFile>).data)
          )
        })
      )
    ),

    // Convert to Hoppscotch environments
    O.map((exports) =>
      exports.flatMap((files) =>
        files.flatMap((exp) =>
          exp.resources.environments.map((env) => ({
            id: uniqueID(),
            v: EnvironmentSchemaVersion,
            name: env.name,
            variables: env.variables.map((v) => ({
              key: v.name,
              initialValue: v.value,
              currentValue: v.value,
              secret: false,
            })),
          }))
        )
      )
    ),

    // Fail if parsing/validation failed
    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )
