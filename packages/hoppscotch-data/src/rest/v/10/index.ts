import { z } from "zod"
import { V9_SCHEMA } from "../9"
import { HoppRESTReqBody } from "./body"
import { defineVersion } from "verzod"

export const V10_SCHEMA = V9_SCHEMA.extend({
  v: z.literal("10"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  schema: V10_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V9_SCHEMA>) {
    return {
      ...old,
      v: "10" as const,
    }
  },
})
