import { z } from "zod"
import { defineVersion } from "verzod"
import { V1_SCHEMA } from "./1"

export const V2_SCHEMA = V1_SCHEMA.extend({
  v: z.literal(2),
  variables: z.array(
    z.object({
      key: z.string(),
      initialValue: z.string(),
      currentValue: z.string(),
      secret: z.boolean(),
    })
  ),
})

export default defineVersion({
  initial: false,
  schema: V2_SCHEMA,
  up(old: z.infer<typeof V1_SCHEMA>) {
    const result: z.infer<typeof V2_SCHEMA> = {
      ...old,
      v: 2,
      variables: old.variables.map((variable) => {
        const { key, secret } = variable
        // if the variable is secret, set initialValue and currentValue to empty string
        // else set initialValue and currentValue to value
        // and delete value
        return {
          key,
          secret: secret ?? false,
          initialValue: variable.secret ? "" : variable.value,
          currentValue: variable.secret ? "" : variable.value,
        }
      }),
    }

    return result
  },
})
