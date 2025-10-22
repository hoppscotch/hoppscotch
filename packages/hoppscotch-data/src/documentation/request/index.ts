import { InferredEntity, createVersionedEntity } from "verzod"

import { z } from "zod"

import V1_VERSION from "./v/1"
import { generateUniqueRefId } from "../../utils/collection"

const versionedObject = z.object({
  v: z.number(),
})

export const RequestDocumentation = createVersionedEntity({
  latestVersion: 1,
  versionMap: {
    1: V1_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V1 we have to check the schema
    const result = V1_VERSION.schema.safeParse(data)

    return result.success ? 1 : null
  },
})

export type RequestDocumentation = InferredEntity<typeof RequestDocumentation>

export function getDefaultRequestDocumentation(
  requestId?: string
): RequestDocumentation {
  console.log("Generating default request documentation")
  return {
    v: 1,
    id: generateUniqueRefId("req_doc"),
    requestId: requestId || "",
    title: "New Documentation",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastModifiedBy: "",
    permission: "OWNER",
  }
}
