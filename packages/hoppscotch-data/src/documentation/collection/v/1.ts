import { defineVersion } from "verzod"
import { z } from "zod"

export const V1_SCHEMA = z.object({
  v: z.literal(1),
  id: z.string(),

  collectionId: z.string(),

  title: z.string(),

  content: z.string().catch(""),

  createdAt: z.number().catch(Date.now()),
  updatedAt: z.number().catch(Date.now()),

  lastModifiedBy: z.string().catch(""),

  permission: z.enum(["OWNER", "VIEWER", "EDITOR"]).catch("OWNER"),

  version: z
    .object({
      current: z.string().catch("1.0.0"),
      previous: z.array(z.string()).catch([]).optional(),
      isDefault: z.boolean().catch(true),
    })
    .optional(),

  display: z
    .object({
      theme: z.enum(["light", "dark", "system"]).catch("system").optional(),
      logo: z.string().catch("").optional(),
      accentColor: z.string().catch("#4F46E5").optional(),
    })
    .optional(),

  publishedMetadata: z
    .object({
      isPublished: z.boolean().catch(false).optional(),
      publishedAt: z.number().catch(0).optional(),
      publishedBy: z.string().catch("").optional(),
      publishedAccess: z
        .enum(["PUBLIC", "PRIVATE"])
        .catch("PRIVATE")
        .optional(),
      shareableLink: z.string().catch("").optional(),
    })
    .optional(),
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
