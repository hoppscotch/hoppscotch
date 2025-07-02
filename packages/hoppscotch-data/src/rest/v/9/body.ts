import { z } from "zod"

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
        value: z.array(z.instanceof(Blob).nullable()).catch([]),
      }),
      z.object({
        isFile: z.literal(false),
        value: z.string(),
      }),
    ])
  )
  .transform((data) => {
    // Sample use case about restoring the `value` field in an empty state during page reload
    // for files chosen in the previous attempt
    if (data.isFile && Array.isArray(data.value) && data.value.length === 0) {
      return {
        ...data,
        isFile: false,
        value: "",
      }
    }

    return data
  })

export type FormDataKeyValue = z.infer<typeof FormDataKeyValue>

export const HoppRESTReqBody = z.union([
  z.object({
    contentType: z.literal(null),
    body: z.literal(null).catch(null),
  }),
  z.object({
    contentType: z.literal("multipart/form-data"),
    body: z.array(FormDataKeyValue).catch([]),
    showIndividualContentType: z.boolean().optional().catch(false),
  }),
  z.object({
    contentType: z.literal("application/octet-stream"),
    body: z.instanceof(File).nullable().catch(null),
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
