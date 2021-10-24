import { HoppRESTAuth } from "./HoppRESTAuth"
import {
  HoppRESTParam,
  HoppRESTHeader,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "./HoppRESTRequest"
import { HoppRESTResponse } from "./HoppRESTResponse"

export interface HoppRESTExampleResponse {
  type: string
  headers: { key: string; value: string }[]
  body: string
  statusCode: number
  meta: {
    responseSize: number // in bytes
    responseDuration: number // in millis
  }
}

export interface HoppRESTExample {
  name: string
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
  preRequestScript: string
  testScript: string

  auth: HoppRESTAuth
  body: HoppRESTReqBody
  response: HoppRESTExampleResponse | undefined
}

export const fromResponse = (
  response: HoppRESTResponse
): HoppRESTExampleResponse | undefined => {
  if (response.type !== "success") {
    return undefined
  }

  return {
    type: response.type,
    headers: response.headers,
    body: new TextDecoder("utf-8").decode(response.body),
    statusCode: response.statusCode,
    meta: response.meta,
  }
}

export const fromRequestAndResponse = (
  request: HoppRESTRequest,
  response: HoppRESTResponse,
  index: Number
): HoppRESTExample => {
  return {
    name: `${request.name}_example_${index}`,
    method: request.method,
    endpoint: request.endpoint,
    params: request.params,
    headers: request.headers,
    preRequestScript: request.preRequestScript,
    testScript: request.testScript,
    auth: request.auth,
    body: request.body,
    response: fromResponse(response),
  }
}

export const toRequest = (example: HoppRESTExample): HoppRESTRequest => {
  return {
    v: "",
    name: example.name,
    method: example.method,
    endpoint: example.endpoint,
    params: example.params,
    headers: example.headers,
    preRequestScript: example.preRequestScript,
    testScript: example.testScript,
    auth: example.auth,
    body: example.body,
    examples: [],
  }
}
