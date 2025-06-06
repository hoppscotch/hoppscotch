import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { HoppRESTResponseHeaders, ValidCodes } from "../../rest/v/8"
import { HoppRESTResponseOriginalRequest } from "../original-request"

export const V0_SCHEMA = z.object({
  name: z.string(),
  originalRequest: entityReference(HoppRESTResponseOriginalRequest),
  status: z.string(),
  code: z.optional(ValidCodes).nullable().catch(null),
  headers: HoppRESTResponseHeaders,
  body: z.string(),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA,
})
