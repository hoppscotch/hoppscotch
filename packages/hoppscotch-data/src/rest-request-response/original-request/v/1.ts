import { defineVersion } from "verzod"
import { z } from "zod"
import { HoppRESTHeaders, HoppRESTParams } from "../../../rest/v/7"
import { HoppRESTReqBody } from "../../../rest/v/6"
import { HoppRESTRequestVariables } from "../../../rest/v/2"

import { HoppRESTAuth } from "../../../rest/v/8/auth"

export const V1_SCHEMA = z.object({
  v: z.literal("1"),
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
  schema: V1_SCHEMA,
})
