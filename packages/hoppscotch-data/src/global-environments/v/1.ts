//global environment version 1

import { z } from "zod"
import { defineVersion } from "verzod"
import { V0_SCHEMA } from "./0"

export const V1_SCHEMA = z.object({
    v: z.literal(1),
    variables: z.array(
      z.union([
        z.object({
          key: z.string(),
          secret: z.literal(true),
        }),
        z.object({
          key: z.string(),
          value: z.string(),
          secret: z.literal(false),
        }),
      ])
    ),
})

export default defineVersion({
  initial: false,
  schema: V1_SCHEMA,
  //add modifications to adapt v0 schema to v1 - hence the error in up
  up(old: z.infer<typeof V0_SCHEMA>) { // up means upgrade
    return <z.infer<typeof V1_SCHEMA>>{
      ...old,
      v: 1,
      variables: old.variables.map((variable) => {
        return {
          ...variable,
          secret: false,
        }
      }),
    }
  
  },
})