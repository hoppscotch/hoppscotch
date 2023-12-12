import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { HoppRESTRequest, HoppRESTAuth } from "../../rest"
import { HoppGQLRequest, HoppGQLAuth, GQLHeader } from "../../graphql"
import { V1_SCHEMA } from "./1"
import { HoppRESTHeaders } from "../../rest/v/1"

const baseCollectionSchema = z.object({
  v: z.literal(2),
  id: z.optional(z.string()), // For Firestore ID data

  name: z.string(),
  requests: z.array(
    z.lazy(() =>
      z.union([
        entityReference(HoppRESTRequest),
        entityReference(HoppGQLRequest),
      ])
    )
  ),

  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
  headers: z.union([HoppRESTHeaders, z.array(GQLHeader)]),
})

type Input = z.input<typeof baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof baseCollectionSchema> & {
  folders: Output[]
}

export const V2_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> = baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(V2_SCHEMA)),
})

export default defineVersion({
  initial: false,
  schema: V2_SCHEMA,
  up(old: z.infer<typeof V1_SCHEMA>) {
    // @ts-expect-error
    const result: z.infer<typeof V2_SCHEMA> = {
      ...old,
      v: 2,
      auth: {
        authActive: true,
        authType: "inherit",
      },
      headers: [],
    }

    if (old.id) result.id = old.id

    return result
  },
})
