import { InferredEntity, createVersionedEntity } from "verzod"
import { z } from "zod"
import V1_VERSION from "./v/1"
import V2_VERSION from "./v/2"
import V3_VERSION from "./v/3"
import V4_VERSION from "./v/4"

export { GQLHeader } from "./v/1"
export {
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthNone,
  HoppGQLAuthInherit,
} from "./v/2"

export { HoppGQLAuth } from "./v/4"
export { HoppGQLAuthOAuth2 } from "./v/3"
export { HoppGQLAuthAPIKey } from "./v/4"

export const GQL_REQ_SCHEMA_VERSION = 4

const versionedObject = z.object({
  v: z.number(),
})

export const HoppGQLRequest = createVersionedEntity({
  latestVersion: 4,
  versionMap: {
    1: V1_VERSION,
    2: V2_VERSION,
    3: V3_VERSION,
    4: V4_VERSION,
  },
  getVersion(x) {
    const result = versionedObject.safeParse(x)

    return result.success ? result.data.v : null
  },
})

export type HoppGQLRequest = InferredEntity<typeof HoppGQLRequest>

const DEFAULT_QUERY = `
query Request {
  method
  url
  headers {
    key
    value
  }
}`.trim()

export function getDefaultGQLRequest(): HoppGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    name: "Untitled",
    url: "https://echo.hoppscotch.io/graphql",
    headers: [],
    variables: `
{
  "id": "1"
}`.trim(),
    query: DEFAULT_QUERY,
    auth: {
      authType: "inherit",
      authActive: true,
    },
  }
}

/**
 * @deprecated This function is deprecated. Use `HoppGQLRequest` instead.
 */
export function translateToGQLRequest(x: unknown): HoppGQLRequest {
  const result = HoppGQLRequest.safeParse(x)
  return result.type === "ok" ? result.value : getDefaultGQLRequest()
}

export function makeGQLRequest(x: Omit<HoppGQLRequest, "v">): HoppGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    ...x,
  }
}
