import { createVersionedEntity, InferredEntity } from "verzod"
import { z } from "zod"
import V1_VERSION, { GRPCMetadata, GRPCProtoFile } from "./v/1"

export { GRPCMetadata, GRPCProtoFile }

export const GRPC_REQ_SCHEMA_VERSION = 1

const versionedObject = z.object({
  v: z.number(),
})

export const HoppGRPCRequest = createVersionedEntity({
  latestVersion: GRPC_REQ_SCHEMA_VERSION,
  versionMap: {
    1: V1_VERSION,
  },
  getVersion(value) {
    const result = versionedObject.safeParse(value)
    return result.success ? result.data.v : null
  },
})

export type HoppGRPCRequest = InferredEntity<typeof HoppGRPCRequest>

export function getDefaultGRPCRequest(): HoppGRPCRequest {
  return {
    v: GRPC_REQ_SCHEMA_VERSION,
    name: "Untitled",
    url: "http://localhost:8080",
    protoFiles: [],
    service: "",
    method: "",
    body: "{\n}",
    metadata: [],
  }
}

export function makeGRPCRequest(
  request: Omit<HoppGRPCRequest, "v">
): HoppGRPCRequest {
  return {
    v: GRPC_REQ_SCHEMA_VERSION,
    ...request,
  }
}
