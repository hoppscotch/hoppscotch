import { defineVersion } from "verzod"
import { z } from "zod"

import { GQLHeader as GQLHeaderV1 } from "../../graphql/v/1"
import { GQLHeader as GQLHeaderV2 } from "../../graphql/v/6"
import { HoppRESTHeaders as V1_HoppRESTHeaders } from "../../rest/v/1"
import { HoppRESTHeaders as V2_HoppRESTHeaders } from "../../rest/v/7"
import { v2_baseCollectionSchema, V2_SCHEMA } from "./2"

const v3_baseCollectionSchema = v2_baseCollectionSchema.extend({
  v: z.literal(3),
  headers: z.union([V2_HoppRESTHeaders, z.array(GQLHeaderV2)]),
})

type Input = z.input<typeof v3_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v3_baseCollectionSchema> & {
  folders: Output[]
}

export const V3_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> =
  v3_baseCollectionSchema.extend({
    folders: z.lazy(() => z.array(V3_SCHEMA)),
  })

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    const headers = (old.headers as V1_HoppRESTHeaders | GQLHeaderV1[]).map(
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
