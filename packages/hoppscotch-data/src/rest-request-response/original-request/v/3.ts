import { defineVersion } from "verzod"
import { z } from "zod"
import { HoppRESTHeaders, HoppRESTParams } from "../../../rest/v/7"
import { HoppRESTReqBody } from "../../../rest/v/10"
import { HoppRESTAuth } from "../../../rest/v/11"
import { HoppRESTRequestVariables } from "../../../rest/v/2"

export const V3_SCHEMA = z.object({
  v: z.literal("3"),
  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  headers: HoppRESTHeaders,
  params: HoppRESTParams,
  body: HoppRESTReqBody,
  auth: HoppRESTAuth,
  requestVariables: HoppRESTRequestVariables,
})

export default defineVersion({
  initial: true,
  schema: V3_SCHEMA,
})
