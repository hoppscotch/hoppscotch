import { defineVersion } from "verzod"
import { z } from "zod"
import { V10_SCHEMA } from "./10"

export const V11_SCHEMA = V10_SCHEMA.extend({
  v: z.literal(11),
  description: z.string().nullable().catch(null),
})

export default defineVersion({
  schema: V11_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V10_SCHEMA>) {
    return {
      ...old,
      v: 11 as const,
      description: null,
    }
  },
})
