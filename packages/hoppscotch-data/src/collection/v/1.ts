import { defineVersion, entityReference, entityRefUptoVersion } from "verzod"
import { z } from "zod"
import { HoppRESTRequest } from "../../rest"
import { HoppGQLRequest } from "../../graphql"
import { HoppCollection } from ".."

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

type Input = z.input<typeof baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof baseCollectionSchema> & {
  folders: Output[]
}

export const V1_SCHEMA = baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 1))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
