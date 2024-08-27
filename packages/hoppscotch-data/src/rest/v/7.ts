import { defineVersion } from "verzod"
import { z } from "zod"

import { V6_SCHEMA } from "./6"

export const HoppRESTParams = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type HoppRESTParams = z.infer<typeof HoppRESTParams>

export const HoppRESTHeaders = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type HoppRESTHeaders = z.infer<typeof HoppRESTHeaders>

export const V7_SCHEMA = V6_SCHEMA.extend({
  v: z.literal("7"),
  params: HoppRESTParams,
  headers: HoppRESTHeaders,
})

export default defineVersion({
  schema: V7_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const params = old.params.map((param) => {
      return {
        ...param,
        description: "",
      }
    })

    const headers = old.headers.map((header) => {
      return {
        ...header,
        description: "",
      }
    })

    return {
      ...old,
      v: "7" as const,
      params,
      headers,
    }
  },
})
