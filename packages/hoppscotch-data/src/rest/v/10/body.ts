import { z } from "zod"
import { FormDataKeyValue } from "../9/body"

export const HoppRESTReqBody = z.union([
  z.object({
    contentType: z.literal(null),
    body: z.literal(null).catch(null),
  }),
  z.object({
    contentType: z.literal("multipart/form-data"),
    body: z.array(FormDataKeyValue).catch([]),
    showIndividualContentType: z.boolean().optional().catch(false),
    isBulkEditing: z.boolean().optional().catch(false),
  }),
  z.object({
    contentType: z.literal("application/octet-stream"),
    body: z.instanceof(File).nullable().catch(null),
  }),
  z.object({
    contentType: z.literal("application/x-www-form-urlencoded"),
    body: z.string().catch(""),
    isBulkEditing: z.boolean().optional().catch(false),
  }),
  z.object({
    contentType: z.union([
      z.literal("application/json"),
      z.literal("application/ld+json"),
      z.literal("application/hal+json"),
      z.literal("application/vnd.api+json"),
      z.literal("application/xml"),
      z.literal("text/xml"),
      z.literal("binary"),
      z.literal("text/html"),
      z.literal("text/plain"),
    ]),
    body: z.string().catch(""),
  }),
])

export type HoppRESTReqBody = z.infer<typeof HoppRESTReqBody>
