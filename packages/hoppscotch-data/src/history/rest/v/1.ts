import { z } from "zod"
import { defineVersion, entityReference } from "verzod"
import { HoppRESTRequest } from "../../../rest"

const HoppRESTRequestSchema = entityReference(HoppRESTRequest)

export const V1_SCHEMA = z
  .object({
    v: z.literal(1),
    request: HoppRESTRequestSchema,
    responseMeta: z
      .object({
        duration: z.nullable(z.number()),
        statusCode: z.nullable(z.number()),
      })
      .strict(),
    star: z.boolean(),
    id: z.optional(z.string()),
    updatedOn: z.optional(z.union([z.date(), z.string()])),
  })
  .strict()

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})