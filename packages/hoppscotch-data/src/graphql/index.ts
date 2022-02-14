import { HoppGQLAuth } from "./HoppGQLAuth"

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
  if (x.v && x.v === 1) return x

  // Old request
  const name = x.name ?? "Untitled"
  const url = x.url ?? ""
  const headers = x.headers ?? []
  const query = x.query ?? ""
  const variables = x.variables ?? []
  const auth = parseOldGQLAuth(x)

  return {
    v: 1,
    name,
    url,
    headers,
    query,
    variables,
    auth
  }
}

export function parseOldGQLAuth(x: any): HoppGQLAuth {
  if (!x.auth || x.auth === "None")
    return {
      authType: "none",
      authActive: true,
    }

  if (x.auth === "Basic Auth")
    return {
      authType: "basic",
      authActive: true,
      username: x.httpUser,
      password: x.httpPassword,
    }

  if (x.auth === "Bearer Token")
    return {
      authType: "bearer",
      authActive: true,
      token: x.bearerToken,
    }

  return { authType: "none", authActive: true }
}

export function makeGQLRequest(x: Omit<HoppGQLRequest, "v">) {
  return {
    v: 1,
    ...x,
  }
}
