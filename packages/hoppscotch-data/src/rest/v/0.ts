import { defineVersion } from "verzod"
import { z } from "zod"

export const V0_SCHEMA = z.object({
  id: z.optional(z.string()), // Firebase Firestore ID

  url: z.string(),
  path: z.string(),
  headers: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      active: z.boolean()
    })
  ),
  params: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      active: z.boolean()
    })
  ),
  name: z.string(),
  method: z.string(),
  preRequestScript: z.string(),
  testScript: z.string(),
  contentType: z.string(),
  body: z.string(),
  rawParams: z.optional(z.string()),
  auth: z.optional(z.string()),
  httpUser: z.optional(z.string()),
  httpPassword: z.optional(z.string()),
  bearerToken: z.optional(z.string()),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA
})
