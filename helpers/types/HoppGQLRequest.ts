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
}

export function translateToGQLRequest(x: any): HoppGQLRequest {
  if (x.v && x.v === 1) return x

  // Old request
  const name = x.name ?? "Untitled"
  const url = x.url ?? ""
  const headers = x.headers ?? []
  const query = x.query ?? ""
  const variables = x.variables ?? []

  return {
    v: 1,
    name,
    url,
    headers,
    query,
    variables,
  }
}

export function makeGQLRequest(x: Omit<HoppGQLRequest, "v">) {
  return {
    v: 1,
    ...x,
  }
}
