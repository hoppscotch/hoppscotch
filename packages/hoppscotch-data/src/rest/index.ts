import cloneDeep from "lodash/cloneDeep"
import { ValidContentTypes } from "./content-types"
import { HoppRESTAuth } from "./HoppRESTAuth"

export * from "./content-types"
export * from "./HoppRESTAuth"

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

export type FormDataKeyValue = {
  key: string
  active: boolean
} & ({ isFile: true; value: Blob[] } | { isFile: false; value: string })

export type HoppRESTReqBodyFormData = {
  contentType: "multipart/form-data"
  body: FormDataKeyValue[]
}

export type HoppRESTReqBody =
  | {
      contentType: Exclude<ValidContentTypes, "multipart/form-data">
      body: string
    }
  | HoppRESTReqBodyFormData
  | {
      contentType: null
      body: null
    }

export interface HoppRESTRequest {
  v: string
  id?: string // Firebase Firestore ID

  name: string
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
  preRequestScript: string
  testScript: string

  auth: HoppRESTAuth

  body: HoppRESTReqBody
}

/**
 * Safely tries to extract REST Request data from an unknown value.
 * If we fail to detect certain bits, we just resolve it to the default value
 * @param x The value to extract REST Request data from
 * @param defaultReq The default REST Request to source from
 */
export function safelyExtractRESTRequest(
  x: unknown,
  defaultReq: HoppRESTRequest
): HoppRESTRequest {
  const req = cloneDeep(defaultReq)

  // TODO: A cleaner way to do this ?
  if (!!x && typeof x === "object") {
    if (x.hasOwnProperty("v") && typeof x.v === "string")
      req.v = x.v

    if (x.hasOwnProperty("id") && typeof x.id === "string")
      req.id = x.id

    if (x.hasOwnProperty("name") && typeof x.name === "string")
      req.name = x.name

    if (x.hasOwnProperty("method") && typeof x.method === "string")
      req.method = x.method

    if (x.hasOwnProperty("endpoint") && typeof x.endpoint === "string")
      req.endpoint = x.endpoint

    if (x.hasOwnProperty("preRequestScript") && typeof x.preRequestScript === "string")
      req.preRequestScript = x.preRequestScript

    if (x.hasOwnProperty("testScript") && typeof x.testScript === "string")
      req.testScript = x.testScript

    if (x.hasOwnProperty("body") && typeof x.body === "object" && !!x.body)
      req.body = x.body as any // TODO: Deep nested checks

    if (x.hasOwnProperty("auth") && typeof x.auth === "object" && !!x.auth)
      req.auth = x.auth as any // TODO: Deep nested checks

    if (x.hasOwnProperty("params") && Array.isArray(x.params))
      req.params = x.params // TODO: Deep nested checks

    if (x.hasOwnProperty("headers") && Array.isArray(x.headers))
      req.headers = x.headers // TODO: Deep nested checks
  }

  return req
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
    }
  }

  return {
    contentType: "application/json",
    body: "",
  }
}

export function translateToNewRequest(x: any): HoppRESTRequest {
  if (isHoppRESTRequest(x)) {
    return x
  } else {
    // Old format
    const endpoint: string = `${x?.url ?? ""}${x?.path ?? ""}`

    const headers: HoppRESTHeader[] = x?.headers ?? []

    // Remove old keys from params
    const params: HoppRESTParam[] = (x?.params ?? []).map(
      ({
        key,
        value,
        active,
      }: {
        key: string
        value: string
        active: boolean
      }) => ({
        key,
        value,
        active,
      })
    )

    const name = x?.name ?? "Untitled request"
    const method = x?.method ?? ""

    const preRequestScript = x?.preRequestScript ?? ""
    const testScript = x?.testScript ?? ""

    const body = parseRequestBody(x)

    const auth = parseOldAuth(x)

    const result: HoppRESTRequest = {
      name,
      endpoint,
      headers,
      params,
      method,
      preRequestScript,
      testScript,
      body,
      auth,
      v: RESTReqSchemaVersion,
    }

    if (x.id) result.id = x.id

    return result
  }
}

export function parseOldAuth(x: any): HoppRESTAuth {
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
