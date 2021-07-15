export const RESTReqSchemaVersion = "1"

export type HoppRESTParam = {
  key: string
  value: string
  active: boolean
}

export type HoppRESTHeader = {
  key: string
  value: string
  active: boolean
}

export interface HoppRESTRequest {
  v: string

  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
}

export function isHoppRESTRequest(x: any): x is HoppRESTRequest {
  return x && typeof x === "object" && "v" in x
}

export function translateToNewRequest(x: any): HoppRESTRequest {
  if (isHoppRESTRequest(x)) {
    return x
  } else {
    // Old format
    const endpoint: string = `${x.url}${x.path}`

    const headers: HoppRESTHeader[] = x.headers

    // Remove old keys from params
    const params: HoppRESTParam[] = (x.params as any[]).map(
      ({ key, value, active }) => ({
        key,
        value,
        active,
      })
    )

    const method = x.method

    return {
      endpoint,
      headers,
      params,
      method,
      v: RESTReqSchemaVersion,
    }
  }
}
