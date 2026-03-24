import { z } from "zod"
import { defineVersion } from "verzod"

export const MCPTransportType = z.enum(["http", "stdio"])
export type MCPTransportType = z.infer<typeof MCPTransportType>

export const MCPEnvVar = z.object({
  key: z.string().catch(""),
  value: z.string().catch(""),
  active: z.boolean().catch(true),
})
export type MCPEnvVar = z.infer<typeof MCPEnvVar>

export const MCPSTDIOConfig = z.object({
  command: z.string(),
  args: z.array(z.string()).catch([]),
  env: z.array(MCPEnvVar).catch([]),
})
export type MCPSTDIOConfig = z.infer<typeof MCPSTDIOConfig>

export const MCPHTTPConfig = z.object({
  url: z.string(),
})
export type MCPHTTPConfig = z.infer<typeof MCPHTTPConfig>

export const MCPAuthNone = z.object({
  authType: z.literal("none"),
  authActive: z.boolean(),
})
export type MCPAuthNone = z.infer<typeof MCPAuthNone>

export const MCPAuthBasic = z.object({
  authType: z.literal("basic"),
  authActive: z.boolean(),
  username: z.string(),
  password: z.string(),
})
export type MCPAuthBasic = z.infer<typeof MCPAuthBasic>

export const MCPAuthBearer = z.object({
  authType: z.literal("bearer"),
  authActive: z.boolean(),
  token: z.string(),
})
export type MCPAuthBearer = z.infer<typeof MCPAuthBearer>

export const MCPAuthAPIKey = z.object({
  authType: z.literal("api-key"),
  authActive: z.boolean(),
  key: z.string(),
  value: z.string(),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})
export type MCPAuthAPIKey = z.infer<typeof MCPAuthAPIKey>

export const MCPAuth = z.discriminatedUnion("authType", [
  MCPAuthNone,
  MCPAuthBasic,
  MCPAuthBearer,
  MCPAuthAPIKey,
])
export type MCPAuth = z.infer<typeof MCPAuth>

export const MCPMethodType = z.enum(["tool", "prompt", "resource"])
export type MCPMethodType = z.infer<typeof MCPMethodType>

export const MCPMethodInvocation = z.object({
  methodType: MCPMethodType.nullable().catch(null),
  methodName: z.string().catch(""),
  arguments: z.string().catch("{}"),
})
export type MCPMethodInvocation = z.infer<typeof MCPMethodInvocation>

export const V1_SCHEMA = z.object({
  v: z.literal(1),
  name: z.string(),
  transportType: MCPTransportType,
  httpConfig: MCPHTTPConfig.nullable().catch(null),
  stdioConfig: MCPSTDIOConfig.nullable().catch(null),
  auth: MCPAuth,
  method: MCPMethodInvocation,
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
