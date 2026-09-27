import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V1_VERSION from "./v/1"

const versionedObject = z.object({
  // v is a stringified number — same convention as the REST counterpart.
  v: z.string().regex(/^\d+$/).transform(Number),
})

export const HoppGQLResponseOriginalRequest = createVersionedEntity({
  latestVersion: 1,
  versionMap: {
    1: V1_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V1 we have to check the schema (matches the REST pattern)
    const result = V1_VERSION.schema.safeParse(data)

    return result.success ? 1 : null
  },
})

export const HoppGQLResOriginalReqSchemaVersion = "1"

export type HoppGQLResponseOriginalRequest = InferredEntity<
  typeof HoppGQLResponseOriginalRequest
>
