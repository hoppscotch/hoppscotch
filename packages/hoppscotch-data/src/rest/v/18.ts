import { z } from "zod"
import { defineVersion } from "verzod"
import { V17_SCHEMA } from "./17"

export const HoppRESTRequestOptions = z.object({
  disableCookies: z.boolean().catch(false).default(false),
})

export type HoppRESTRequestOptions = z.infer<typeof HoppRESTRequestOptions>

export const V18_SCHEMA = V17_SCHEMA.extend({
  v: z.literal("18"),
  requestOptions: HoppRESTRequestOptions.catch({ disableCookies: false }).optional(),
})

const V18_VERSION = defineVersion({
  schema: V18_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V17_SCHEMA>) {
    return {
      ...old,
      v: "18" as const,
      requestOptions: {
        disableCookies: false,
      },
    }
  },
})

export default V18_VERSION
