import { HoppRESTRequest } from "@hoppscotch/data"
import { HoppRESTExampleResponse } from "@hoppscotch/data"
import { getStatusCodeReasonPhrase } from "../utils/statusCodes"
import { Component } from "vue"

export type HoppRESTResponseHeader = { key: string; value: string }

export type HoppRESTResponse =
  | { type: "loading"; req: HoppRESTRequest }
  | {
      type: "fail"
      headers: HoppRESTResponseHeader[]
      body: ArrayBuffer
      statusCode: number
      statusText: string
      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest
    }
  | {
      type: "network_fail"
      error: unknown

      req: HoppRESTRequest
    }
  | {
      type: "script_fail"
      error: Error
    }
  | {
      type: "success"
      headers: HoppRESTResponseHeader[]
      body: ArrayBuffer
      statusCode: number
      statusText: string
      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest
    }
  | {
      type: "extension_error"
      error: string
      component: Component
      req: HoppRESTRequest
    }

export const fromResponse = (
  response: HoppRESTResponse
): HoppRESTExampleResponse | undefined => {
  if (response.type !== "success") {
    return undefined
  }

  const statusPhrase = getStatusCodeReasonPhrase(
    response.statusCode,
    response.statusText
  )
  try {
    return {
      name: `${response.statusCode}\xA0 • \xA0 ${statusPhrase}`,
      type: response.type,
      headers: response.headers,
      body: new TextDecoder("utf-8").decode(response.body),
      statusCode: response.statusCode,
      meta: response.meta,
    }
  } catch (err) {
    return {
      name: `${response.statusCode}\xA0 • \xA0 ${statusPhrase}`,
      type: response.type,
      headers: response.headers,
      body: response.body,
      statusCode: response.statusCode,
      meta: response.meta,
    }
  }
}
