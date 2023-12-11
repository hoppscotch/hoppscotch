import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { HoppRESTRequest } from "../../rest"
import { HoppGQLRequest } from "../../graphql"

const baseCollectionSchema = z.object({
  v: z.literal(1),
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
})

type Collection = z.infer<typeof baseCollectionSchema> & {
  folders: Collection[]
}

//@ts-expect-error ~ Recursive type
export const V1_SCHEMA: z.ZodType<Collection> = baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(V1_SCHEMA)),
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
