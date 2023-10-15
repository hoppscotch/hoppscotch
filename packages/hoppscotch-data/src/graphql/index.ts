import { InferredEntity, createVersionedEntity } from "verzod"
import V1_VERSION from "./v/1"
import V2_VERSION from "./v/2"

export { GQLHeader } from "./v/1"
export {
  HoppGQLAuth,
  HoppGQLAuthAPIKey,
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthNone,
  HoppGQLAuthOAuth2
} from "./v/2"

export const GQL_REQ_SCHEMA_VERSION = 2

export const HoppGQLRequest = createVersionedEntity({
  latestVersion: 2,
  versionMap: {
    1: V1_VERSION,
    2: V2_VERSION
  },
  getVersion(x) {
    return typeof x === "object"
      && x !== null
      && "v" in x
      && typeof x.v === "number"
        ? x.v
        : 0
  }
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
      authType: "none",
      authActive: true,
    },
  }
}

/**
 * @deprecated This function is deprecated. Use `HoppGQLRequest` instead.
 */
export function translateToGQLRequest(x: unknown): HoppGQLRequest {
  const result = HoppGQLRequest.safeParse(x)

  if (result.type === "ok") return result.value

  return getDefaultGQLRequest()
}

export function makeGQLRequest(x: Omit<HoppGQLRequest, "v">): HoppGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    ...x,
  }
}
