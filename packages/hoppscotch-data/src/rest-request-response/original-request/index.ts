import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V3_VERSION from "./v/3"
import V4_VERSION from "./v/4"
import V5_VERSION from "./v/5"

const versionedObject = z.object({
  // v is a stringified number
  v: z.string().regex(/^\d+$/).transform(Number),
})

export const HoppRESTResponseOriginalRequest = createVersionedEntity({
  latestVersion: 5,
  versionMap: {
    3: V3_VERSION,
    4: V4_VERSION,
    5: V5_VERSION,
  },
  getVersion(data) {
    // For V1 onwards we have the v string storing the number
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V0 we have to check the schema
    const result = V3_VERSION.schema.safeParse(data)

    return result.success ? 3 : null
  },
})

export const HoppRESTResOriginalReqSchemaVersion = "5"

export type HoppRESTResponseOriginalRequest = InferredEntity<
  typeof HoppRESTResponseOriginalRequest
>
