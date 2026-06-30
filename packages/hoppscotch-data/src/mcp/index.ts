import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V1_VERSION from "./v/1"

export {
  MCPTransportType,
  MCPEnvVar,
  MCPSTDIOConfig,
  MCPHTTPConfig,
  MCPAuth,
  MCPAuthNone,
  MCPAuthBasic,
  MCPAuthBearer,
  MCPAuthAPIKey,
  MCPMethodType,
  MCPMethodInvocation,
} from "./v/1"

export const MCP_REQ_SCHEMA_VERSION = 1

const versionedObject = z.object({
  v: z.number(),
})

export const HoppMCPRequest = createVersionedEntity({
  latestVersion: 1,
  versionMap: {
    1: V1_VERSION,
  },
  getVersion(x) {
    const result = versionedObject.safeParse(x)

    return result.success ? result.data.v : null
  },
})

export type HoppMCPRequest = InferredEntity<typeof HoppMCPRequest>

export function getDefaultMCPRequest(): HoppMCPRequest {
  return {
    v: MCP_REQ_SCHEMA_VERSION,
    name: "Untitled MCP Request",
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      env: [],
    },
    httpConfig: null,
    auth: {
      authType: "none",
    },
    authActive: false,
    method: {
      methodType: null,
      methodName: "",
      arguments: "{}",
    },
  }
}

/**
 * @deprecated This function is deprecated. Use `HoppMCPRequest` instead.
 */
export function translateToMCPRequest(x: unknown): HoppMCPRequest {
  const result = HoppMCPRequest.safeParse(x)
  return result.type === "ok" ? result.value : getDefaultMCPRequest()
}

export function makeMCPRequest(x: Omit<HoppMCPRequest, "v">): HoppMCPRequest {
  return {
    v: MCP_REQ_SCHEMA_VERSION,
    ...x,
  }
}
