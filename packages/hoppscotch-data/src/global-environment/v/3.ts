import { z } from "zod"
import { defineVersion } from "verzod"
import { V2_SCHEMA } from "./2"

export const V3_SCHEMA = z.object({
  v: z.literal(3),
  variables: z.array(
    z.object({
      key: z.string(),
      initialValue: z.string(),
      currentValue: z.string(),
      secret: z.boolean(),
      isFile: z.boolean().default(false),
    })
  ),
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    return {
      ...old,
      v: 3 as const,
      variables: old.variables.map((variable) => ({
        ...variable,
        isFile: false,
      })),
    }
  },
})
