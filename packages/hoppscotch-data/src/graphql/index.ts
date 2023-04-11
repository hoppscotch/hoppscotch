import { HoppGQLAuth } from "./HoppGQLAuth"

export * from "./HoppGQLAuth"

export const GQL_REQ_SCHEMA_VERSION = 2

export type GQLHeader = {
  key: string
  value: string
  active: boolean
}

export type HoppGQLRequest = {
  id?: string
  v: number
  name: string
  url: string
  headers: GQLHeader[]
  query: string
  variables: string
  auth: HoppGQLAuth
}

export function translateToGQLRequest(x: any): HoppGQLRequest {
  if (x.v && x.v === GQL_REQ_SCHEMA_VERSION) return x

  // Old request
  const name = x.name ?? "Untitled"
  const url = x.url ?? ""
  const headers = x.headers ?? []
  const query = x.query ?? ""
  const variables = x.variables ?? []
  const auth = x.auth ?? {
    authType: "none",
    authActive: true,
  }

  return {
    v: GQL_REQ_SCHEMA_VERSION,
    name,
    url,
    headers,
    query,
    variables,
    auth
  }
}

export function makeGQLRequest(x: Omit<HoppGQLRequest, "v">): HoppGQLRequest {
  return {
    v: GQL_REQ_SCHEMA_VERSION,
    ...x,
  }
}
