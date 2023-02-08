import { HoppRESTRequest } from "@hoppscotch/data"

export type HoppRESTResponseHeader = { key: string; value: string }

export type HoppRESTResponse =
  | { type: "loading"; req: HoppRESTRequest }
  | {
      type: "fail"
      headers: HoppRESTResponseHeader[]
      body: ArrayBuffer
      statusCode: number

      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest
    }
  | {
      type: "network_fail"
      error: Error

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
      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest
    }
