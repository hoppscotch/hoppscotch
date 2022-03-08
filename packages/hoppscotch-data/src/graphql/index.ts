import { HoppGQLAuth } from "./HoppGQLAuth"

export * from "./HoppGQLAuth"

export const GQLReqSchemaVersion = 2

export type GQLHeader = {
  key: string
  value: string
  active: boolean
}

export type HoppGQLRequest = {
  v: number
  name: string
  url: string
  headers: GQLHeader[]
  query: string
  variables: string
  auth: HoppGQLAuth
}

export function translateToGQLRequest(x: any): HoppGQLRequest {
  if (x.v && x.v === GQLReqSchemaVersion) return x

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
    v: GQLReqSchemaVersion,
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
    v: GQLReqSchemaVersion,
    ...x,
  }
}
