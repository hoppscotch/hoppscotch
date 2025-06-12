import { defineVersion } from "verzod"
import { z } from "zod"
import { V3_SCHEMA } from "./3"
import { HoppRESTAuth } from "../../../rest/v/12/auth"

export const V4_SCHEMA = V3_SCHEMA.extend({
  v: z.literal("4"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  initial: false,
  schema: V4_SCHEMA,
  up(old: z.infer<typeof V3_SCHEMA>) {
    return {
      ...old,
      v: "4" as const,
    }
  },
})
