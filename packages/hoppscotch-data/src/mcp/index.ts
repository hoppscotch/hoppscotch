import {
  InferredEntity,
  createVersionedEntity,
  entityReference,
} from "verzod"
import { z } from "zod"
import { generateUniqueRefId } from "../utils/collection"
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
  getVersion(data) {
    const result = versionedObject.safeParse(data)
    return result.success ? result.data.v : null
  },
})

export type HoppMCPRequest = InferredEntity<typeof HoppMCPRequest>

export const HoppMCPCollection = z.object({
  id: z.string().optional(),
  _ref_id: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().catch(null),
  requests: z.array(entityReference(HoppMCPRequest)).catch([]),
})

export type HoppMCPCollection = z.infer<typeof HoppMCPCollection>

export function getDefaultMCPRequest(): HoppMCPRequest {
  return {
    v: MCP_REQ_SCHEMA_VERSION,
    name: "Untitled MCP Request",
    transportType: "http",
    httpConfig: {
      url: "",
    },
    stdioConfig: null,
    auth: {
      authType: "none",
      authActive: false,
    },
    method: {
      methodType: null,
      methodName: "",
      arguments: "{}",
    },
  }
}

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

export function makeMCPCollection(
  x: Omit<HoppMCPCollection, "_ref_id"> & { _ref_id?: string }
): HoppMCPCollection {
  return {
    _ref_id: x._ref_id ?? generateUniqueRefId("mcp-coll"),
    ...x,
  }
}

export function translateToMCPCollection(x: unknown): HoppMCPCollection {
  const result = HoppMCPCollection.safeParse(x)

  if (result.success) {
    return {
      ...result.data,
      _ref_id: result.data._ref_id ?? generateUniqueRefId("mcp-coll"),
    }
  }

  return makeMCPCollection({
    name: "My MCP Collection",
    description: null,
    requests: [],
  })
}
