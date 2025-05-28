import { defineVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/8"
import { HoppRESTAuth } from "../../rest/v/13"

import { V7_SCHEMA, v7_baseCollectionSchema } from "./7"

export const v8_baseCollectionSchema = v7_baseCollectionSchema.extend({
  v: z.literal(8),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v8_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v8_baseCollectionSchema> & {
  folders: Output[]
}

export const V8_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> =
  v8_baseCollectionSchema.extend({
    folders: z.lazy(() => z.array(V8_SCHEMA)),
  })

export default defineVersion({
  initial: false,
  schema: V8_SCHEMA,
  // @ts-expect-error
  up(old: z.infer<typeof V7_SCHEMA>) {
    return {
      ...old,
      v: 8 as const,
    }
  },
})
