import { defineVersion } from "verzod"
import { z } from "zod"

import { V5_SCHEMA } from "./5"

export const GQLHeader = z.object({
  key: z.string().catch(""),
  value: z.string().catch(""),
  active: z.boolean().catch(true),
  description: z.string().catch(""),
})

export type GQLHeader = z.infer<typeof GQLHeader>

export const V6_SCHEMA = V5_SCHEMA.extend({
  v: z.literal(6),
  headers: z.array(GQLHeader).catch([]),
})

export default defineVersion({
  schema: V6_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const headers = old.headers.map((header) => {
      return {
        ...header,
        description: "",
      }
    })

    return {
      ...old,
      v: 6 as const,
      headers,
    }
  },
})
