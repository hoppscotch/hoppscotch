import { z } from "zod"
import { defineVersion, entityReference } from "verzod"
import { HoppGQLRequest } from "../../../graphql"

const HoppGQLRequestSchema = entityReference(HoppGQLRequest)

export const V1_SCHEMA = z
    .object({
        v: z.literal(1),
        request: HoppGQLRequestSchema,
        response: z.string(),
        star: z.boolean(),
        id: z.optional(z.string()),
        updatedOn: z.optional(z.union([z.date(), z.string()])),
      })
      .strict()

export default defineVersion({
    initial: true,
    schema: V1_SCHEMA,
})