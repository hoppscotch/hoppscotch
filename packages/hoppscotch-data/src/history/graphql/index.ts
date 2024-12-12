import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V1_VERSION from "./v/1"

const versionedObject = z.object({
    v: z.number(),
})
  
export const HoppGQLHistory = createVersionedEntity({
    latestVersion: 1,
    versionMap: {
      1: V1_VERSION,
    },
    getVersion(data) {
      const versionCheck = versionedObject.safeParse(data)
  
      if (versionCheck.success) return versionCheck.data.v
    },
})
  
export type HoppGQLHistory = InferredEntity<typeof HoppGQLHistory>