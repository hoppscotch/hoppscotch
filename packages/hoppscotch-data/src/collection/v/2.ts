import { defineVersion, entityReference } from "verzod"
import { z } from "zod"

import { HoppGQLRequest } from "../../graphql"
import { GQLHeader } from "../../graphql/v/1"
import { HoppGQLAuth } from "../../graphql/v/5"
import { HoppRESTRequest } from "../../rest"
import { HoppRESTHeaders } from "../../rest/v/1"
import { HoppRESTAuth } from "../../rest/v/5"
import { V1_SCHEMA } from "./1"

export const v2_baseCollectionSchema = z.object({
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

type Input = z.input<typeof v2_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v2_baseCollectionSchema> & {
  folders: Output[]
}

export const V2_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> =
  v2_baseCollectionSchema.extend({
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
