import { defineVersion, entityReference } from "verzod"
import { z } from "zod"
import { HoppGQLResponseOriginalRequest } from "../original-request"

export const HoppGQLResponseHeaders = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  })
)

export type HoppGQLResponseHeader = z.infer<typeof HoppGQLResponseHeaders>

export const V0_SCHEMA = z.object({
  name: z.string(),
  originalRequest: entityReference(HoppGQLResponseOriginalRequest),
  // Transport-level status. GQL responses are usually HTTP 200, but transport
  // failures can surface non-200s; keep these for parity with the REST shape.
  status: z.string(),
  code: z.optional(z.number()).nullable().catch(null),
  headers: HoppGQLResponseHeaders,
  body: z.string(),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA,
})
