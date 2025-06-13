import { defineVersion } from "verzod"
import { z } from "zod"

import { V8_SCHEMA } from "../8"
import { HoppRESTReqBody } from "./body"

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal("9"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  schema: V9_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V8_SCHEMA>) {
    // No migration for body, the new contentType added to each formdata field is optional
    return {
      ...old,
      v: "9" as const,
    }
  },
})
