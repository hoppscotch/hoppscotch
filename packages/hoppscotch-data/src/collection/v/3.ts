import { defineVersion, entityReference } from "verzod"
import { z } from "zod"

import { HoppGQLAuth, HoppGQLRequest } from "../../graphql"
import { GQLHeader as GQLHeaderV2 } from "../../graphql/v/6"
import { GQLHeader as GQLHeaderV1 } from "../../graphql/v/1"
import { HoppRESTAuth, HoppRESTRequest } from "../../rest"
import { HoppRESTHeaders as HoppRESTHeadersV1 } from "../../rest/v/1"
import { HoppRESTHeaders as HoppRESTHeadersV2 } from "../../rest/v/7"
import { V2_SCHEMA } from "./2"

const baseCollectionSchema = z.object({
  v: z.literal(3),
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
  headers: z.union([HoppRESTHeadersV2, z.array(GQLHeaderV2)]),
})

type Input = z.input<typeof baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof baseCollectionSchema> & {
  folders: Output[]
}

export const V3_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> =
  baseCollectionSchema.extend({
    folders: z.lazy(() => z.array(V3_SCHEMA)),
  })

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    const headers = (old.headers as HoppRESTHeadersV1 | GQLHeaderV1[]).map(
      (header) => ({
        ...header,
        description: "",
      })
    )

    // @ts-expect-error
    const result: z.infer<typeof V3_SCHEMA> = {
      ...old,
      v: 3,
      headers,
    }

    return result
  },
})
