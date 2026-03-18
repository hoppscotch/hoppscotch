import { defineVersion } from "verzod"
import { z } from "zod"
import { V4_SCHEMA } from "./4"
import { HoppRESTAuth } from "../../../rest/v/13/auth"

export const V5_SCHEMA = V4_SCHEMA.extend({
  v: z.literal("5"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  initial: false,
  schema: V5_SCHEMA,
  up(old: z.infer<typeof V4_SCHEMA>) {
    return {
      ...old,
      v: "5" as const,
    }
  },
})
