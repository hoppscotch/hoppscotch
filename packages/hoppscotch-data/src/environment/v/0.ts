import { z } from "zod"
import { defineVersion } from "verzod"

export const V0_SCHEMA = z.object({
  id: z.optional(z.string()),
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  )
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA
})
