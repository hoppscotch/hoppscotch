import { z } from "zod"
import { defineVersion } from "verzod"

// MCP Transport types
export const MCPTransportType = z.enum(["stdio", "http"])
export type MCPTransportType = z.infer<typeof MCPTransportType>

// Environment variable for STDIO transport
export const MCPEnvVar = z.object({
  key: z.string().catch(""),
  value: z.string().catch(""),
  active: z.boolean().catch(true),
})
export type MCPEnvVar = z.infer<typeof MCPEnvVar>

// STDIO transport configuration
export const MCPSTDIOConfig = z.object({
  command: z.string(),
  args: z.array(z.string()).catch([]),
  env: z.array(MCPEnvVar).catch([]),
})
export type MCPSTDIOConfig = z.infer<typeof MCPSTDIOConfig>

// HTTP transport configuration
export const MCPHTTPConfig = z.object({
  url: z.string(),
})
export type MCPHTTPConfig = z.infer<typeof MCPHTTPConfig>

// MCP Authentication types (for HTTP transport)
export const MCPAuthNone = z.object({
  authType: z.literal("none"),
})

export const MCPAuthBasic = z.object({
  authType: z.literal("basic"),
  username: z.string(),
  password: z.string(),
})

export const MCPAuthBearer = z.object({
  authType: z.literal("bearer"),
  token: z.string(),
})

export const MCPAuthAPIKey = z.object({
  authType: z.literal("api-key"),
  key: z.string(),
  value: z.string(),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export const MCPAuth = z.discriminatedUnion("authType", [
  MCPAuthNone,
  MCPAuthBasic,
  MCPAuthBearer,
  MCPAuthAPIKey,
])

export type MCPAuth = z.infer<typeof MCPAuth>

// MCP Method types
export const MCPMethodType = z.enum(["tool", "prompt", "resource"])
export type MCPMethodType = z.infer<typeof MCPMethodType>

// MCP Method invocation
export const MCPMethodInvocation = z.object({
  methodType: MCPMethodType.nullable().catch(null),
  methodName: z.string().catch(""),
  arguments: z.string().catch("{}"), // JSON string
})
export type MCPMethodInvocation = z.infer<typeof MCPMethodInvocation>

// Main MCP Request Schema
export const V1_SCHEMA = z.object({
  v: z.literal(1),
  name: z.string(),
  transportType: MCPTransportType,

  // STDIO configuration (only used when transportType is "stdio")
  stdioConfig: MCPSTDIOConfig.nullable().catch(null),

  // HTTP configuration (only used when transportType is "http")
  httpConfig: MCPHTTPConfig.nullable().catch(null),

  // Authentication (only used for HTTP transport)
  auth: MCPAuth,
  authActive: z.boolean().catch(true),

  // Method invocation
  method: MCPMethodInvocation,
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
