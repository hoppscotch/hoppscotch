import { defineVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/8"
import { HoppRESTAuth } from "../../rest/v/12"

import { V6_SCHEMA, v6_baseCollectionSchema } from "./6"

export const v7_baseCollectionSchema = v6_baseCollectionSchema.extend({
  v: z.literal(7),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v7_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v7_baseCollectionSchema> & {
  folders: Output[]
}

export const V7_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> =
  v7_baseCollectionSchema.extend({
    folders: z.lazy(() => z.array(V7_SCHEMA)),
  })

export default defineVersion({
  initial: false,
  schema: V7_SCHEMA,
  // @ts-expect-error
  up(old: z.infer<typeof V6_SCHEMA>) {
    return {
      ...old,
      v: 7 as const,
    }
  },
})
