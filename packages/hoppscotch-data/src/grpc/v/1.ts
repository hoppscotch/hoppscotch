import { defineVersion } from "verzod"
import { z } from "zod"

export const GRPCProtoFile = z.object({
  name: z.string().catch(""),
  content: z.string().catch(""),
})

export type GRPCProtoFile = z.infer<typeof GRPCProtoFile>

export const GRPCMetadata = z.object({
  key: z.string().catch(""),
  value: z.string().catch(""),
  active: z.boolean().catch(true),
})

export type GRPCMetadata = z.infer<typeof GRPCMetadata>

export const V1_SCHEMA = z.object({
  v: z.literal(1),
  name: z.string(),
  url: z.string(),
  protoFiles: z.array(GRPCProtoFile).catch([]),
  service: z.string(),
  method: z.string(),
  body: z.string(),
  metadata: z.array(GRPCMetadata).catch([]),
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
