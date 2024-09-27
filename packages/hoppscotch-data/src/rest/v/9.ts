import { z } from "zod"
import { defineVersion } from "verzod"
import { HoppRESTAuth } from "./8"
import { HoppRESTHeaders, HoppRESTParams } from "./7"
import { V8_SCHEMA } from "./8"
import { HoppRESTRequestVariables, HoppRESTReqBody } from ".."
import { StatusCodes } from "../../utils/statusCodes"

const ValidCodes = z.union(
  Object.keys(StatusCodes).map((code) => z.literal(parseInt(code))) as [
    z.ZodLiteral<number>,
    z.ZodLiteral<number>,
    ...z.ZodLiteral<number>[]
  ]
)

const HoppRESTResponseHeader = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  })
)

export type HoppRESTResponseHeader = z.infer<typeof HoppRESTResponseHeader>

/**
 * The original request that was made to get this response
 * Only the necessary fields are saved
 */
export const HoppRESTResponseOriginalRequest = z.object({
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

export type HoppRESTResponseOriginalRequest = z.infer<
  typeof HoppRESTResponseOriginalRequest
>

export const HoppRESTRequestResponse = z.object({
  name: z.string(),
  originalRequest: HoppRESTResponseOriginalRequest,
  status: z.string(),
  code: z.optional(ValidCodes),
  headers: HoppRESTResponseHeader,
  body: z.string(),
})

export type HoppRESTRequestResponse = z.infer<typeof HoppRESTRequestResponse>

/**
 * The responses saved for a request
 * The key is the name of the response saved by the user
 * The value is the response
 */
export const HoppRESTRequestResponses = z.record(
  z.string(),
  HoppRESTRequestResponse
)

export type HoppRESTRequestResponses = z.infer<typeof HoppRESTRequestResponses>

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal("9"),
  responses: HoppRESTRequestResponses,
})

export default defineVersion({
  initial: false,
  schema: V9_SCHEMA,
  up(old: z.infer<typeof V8_SCHEMA>) {
    return {
      ...old,
      v: "9" as const,
      responses: {},
    }
  },
})
