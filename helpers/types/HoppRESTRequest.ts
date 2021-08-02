import { ValidContentTypes } from "../utils/contenttypes"

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

export type HoppRESTReqBody = {
  contentType: ValidContentTypes
  body: string
  isRaw: boolean
}

export interface HoppRESTRequest {
  v: string

  name: string
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
  preRequestScript: string
  testScript: string

  body: HoppRESTReqBody
}

export function makeRESTRequest(
  x: Omit<HoppRESTRequest, "v">
): HoppRESTRequest {
  return {
    ...x,
    v: RESTReqSchemaVersion,
  }
}

export function isHoppRESTRequest(x: any): x is HoppRESTRequest {
  return x && typeof x === "object" && "v" in x
}

function parseRequestBody(x: any): HoppRESTReqBody {
  if (x.contentType === "application/json") {
    return {
      contentType: "application/json",
      body: x.rawParams,
      isRaw: x.rawInput,
    }
  }

  return {
    contentType: "application/json",
    body: "",
    isRaw: x.rawInput,
  }
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

    const name = x.name
    const method = x.method

    const preRequestScript = x.preRequestScript
    const testScript = x.testScript

    const body = parseRequestBody(x)

    const result: HoppRESTRequest = {
      name,
      endpoint,
      headers,
      params,
      method,
      preRequestScript,
      testScript,
      body,
      v: RESTReqSchemaVersion,
    }

    return result
  }
}
