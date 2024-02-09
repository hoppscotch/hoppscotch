import { defineVersion } from "verzod"
import { z } from "zod"
import {
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
  HoppRESTReqBody,
} from "./1"
import { V1_SCHEMA } from "./1"

export const HoppRESTRequestVariables = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
  })
)

export type HoppRESTRequestVariables = z.infer<typeof HoppRESTRequestVariables>

const V2_SCHEMA = z.object({
  v: z.literal("2"),
  id: z.optional(z.string()), // Firebase Firestore ID

  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  params: HoppRESTParams,
  headers: HoppRESTHeaders,
  preRequestScript: z.string().catch(""),
  testScript: z.string().catch(""),

  auth: HoppRESTAuth,

  body: HoppRESTReqBody,

  requestVariables: HoppRESTRequestVariables,
})

export default defineVersion({
  initial: false,
  schema: V2_SCHEMA,
  up(old: z.infer<typeof V1_SCHEMA>) {
    return {
      ...old,
      v: "2",
      requestVariables: [],
    } as z.infer<typeof V2_SCHEMA>
  },
})
