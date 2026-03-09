import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { HoppRESTResponseOriginalRequest } from "../original-request"
import { StatusCodes } from "../../utils/statusCodes"

export const ValidCodes = z.union(
  Object.keys(StatusCodes).map((code) => z.literal(parseInt(code))) as [
    z.ZodLiteral<number>,
    z.ZodLiteral<number>,
    ...z.ZodLiteral<number>[]
  ]
)

export const HoppRESTResponseHeaders = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  })
)

export type HoppRESTResponseHeader = z.infer<typeof HoppRESTResponseHeaders>

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
