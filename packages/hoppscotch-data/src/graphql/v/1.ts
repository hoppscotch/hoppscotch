import { z } from "zod"
import { defineVersion } from "verzod"

export const GQLHeader = z.object({
  key: z.string(),
  value: z.string(),
  active: z.boolean()
})

export type GQLHeader = z.infer<typeof GQLHeader>

export const V1_SCHEMA = z.object({
  v: z.literal(1),
  name: z.string(),
  url: z.string(),
  headers: z.array(GQLHeader),
  query: z.string(),
  variables: z.string(),
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA
})
