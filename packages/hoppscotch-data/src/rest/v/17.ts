import { z } from "zod"
import { defineVersion } from "verzod"
import { V16_SCHEMA } from "./16"

export const V17_SCHEMA = V16_SCHEMA.extend({
  v: z.literal("17"),
  description: z.string().nullable().catch(null),
})

const V17_VERSION = defineVersion({
  schema: V17_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V17_SCHEMA>) {
    return {
      ...old,
      v: "17" as const,
      description: old.description ?? null,
    }
  },
})

export default V17_VERSION
