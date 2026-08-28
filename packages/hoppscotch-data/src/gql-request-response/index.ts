import { InferredEntity, createVersionedEntity, entityReference } from "verzod"
import { z } from "zod"
import V0_VERSION from "./v/0"
import {
  HoppGQLResOriginalReqSchemaVersion,
  HoppGQLResponseOriginalRequest,
} from "./original-request"

export { HoppGQLResponseOriginalRequest } from "./original-request"

const versionedObject = z.object({
  v: z.number(),
})

export const HoppGQLRequestResponse = createVersionedEntity({
  latestVersion: 0,
  versionMap: {
    0: V0_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // Schema starts at v0 — if no `v` field, fall back to schema match.
    const result = V0_VERSION.schema.safeParse(data)
    return result.success ? 0 : null
  },
})

export type HoppGQLRequestResponse = InferredEntity<
  typeof HoppGQLRequestResponse
>

export const HoppGQLRequestResponses = z.record(
  z.string(),
  entityReference(HoppGQLRequestResponse)
)

export type HoppGQLRequestResponses = z.infer<typeof HoppGQLRequestResponses>

export function makeHoppGQLResponseOriginalRequest(
  x: Omit<HoppGQLResponseOriginalRequest, "v">
): HoppGQLResponseOriginalRequest {
  return {
    v: HoppGQLResOriginalReqSchemaVersion,
    ...x,
  }
}
