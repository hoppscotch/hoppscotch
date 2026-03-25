import { defineVersion } from "verzod"
import { z } from "zod"
import { V9_SCHEMA } from "./9"
import { generateUniqueRefId } from "../../utils/collection"

export const V10_SCHEMA = V9_SCHEMA.extend({
  v: z.literal(10),
  _ref_id: z.string().optional(),
})

export default defineVersion({
  schema: V10_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V9_SCHEMA>) {
    return {
      ...old,
      v: 10 as const,
      _ref_id: generateUniqueRefId("req"),
    }
  },
})
