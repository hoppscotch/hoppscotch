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
  // Operation identity of the run this example was saved from — the mock
  // server matches GraphQL requests by these (name + query/mutation), the
  // way REST examples match by method + path. Optional: examples saved
  // before the stamping existed simply never match by name. Nullable: the
  // mock server canonicalizes the wildcard stamp as null, and JSON writers
  // have no way to express undefined — a null stamp must not fail the parse
  // (the whole `responses` record would be silently reset by its .catch).
  operationName: z.string().nullable().optional(),
  operationType: z.string().nullable().optional(),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA,
})
