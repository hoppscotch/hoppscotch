import { defineVersion } from "verzod"
import { z } from "zod"

export const V1_SCHEMA = z.object({
  v: z.literal(1),
  id: z.string(),

  requestId: z.string(),

  title: z.string(),

  content: z.string().catch(""),

  createdAt: z.number().catch(Date.now()),
  updatedAt: z.number().catch(Date.now()),

  lastModifiedBy: z.string().catch(""),

  permission: z.enum(["OWNER", "VIEWER", "EDITOR"]).catch("OWNER"),
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
