import { defineVersion } from "verzod"
import { z } from "zod"

import { FormDataKeyValue } from "./1"
import { V8_SCHEMA } from "./8"

export const HoppRESTReqBody = z.union([
  z.object({
    contentType: z.literal(null),
    body: z.literal(null).catch(null),
  }),
  z.object({
    contentType: z.literal("multipart/form-data"),
    body: z.array(FormDataKeyValue).catch([]),
  }),
  z.object({
    contentType: z.literal("application/octet-stream"),
    body: z.instanceof(Blob).nullable(),
  }),
  z.object({
    contentType: z.union([
      z.literal("application/json"),
      z.literal("application/ld+json"),
      z.literal("application/hal+json"),
      z.literal("application/vnd.api+json"),
      z.literal("application/xml"),
      z.literal("text/xml"),
      z.literal("application/x-www-form-urlencoded"),
      z.literal("binary"),
      z.literal("text/html"),
      z.literal("text/plain"),
    ]),
    body: z.string().catch(""),
  }),
])

export type HoppRESTReqBody = z.infer<typeof HoppRESTReqBody>

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal("9"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  schema: V9_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V8_SCHEMA>) {
    // No migration, `application/octet-stream` are added to the list of supported content types
    return {
      ...old,
      v: "9" as const,
    }
  },
})
