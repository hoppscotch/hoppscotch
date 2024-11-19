import { defineVersion } from "verzod"
import { z } from "zod"

import { V8_SCHEMA } from "./8"

export const FormDataKeyValue = z
  .object({
    key: z.string(),
    active: z.boolean(),
    contentType: z.string().optional().catch(undefined),
  })
  .and(
    z.union([
      z.object({
        isFile: z.literal(true),
        value: z.array(z.instanceof(Blob).nullable()),
      }),
      z.object({
        isFile: z.literal(false),
        value: z.string(),
      }),
    ])
  )

export type FormDataKeyValue = z.infer<typeof FormDataKeyValue>

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
    contentType: z.union([
      z.literal("application/json"),
      z.literal("application/ld+json"),
      z.literal("application/hal+json"),
      z.literal("application/vnd.api+json"),
      z.literal("application/xml"),
      z.literal("text/xml"),
      z.literal("application/x-www-form-urlencoded"),
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
    // No migration, the new contentType added to each formdata field is optional
    return {
      ...old,
      v: "9" as const,
    }
  },
})
