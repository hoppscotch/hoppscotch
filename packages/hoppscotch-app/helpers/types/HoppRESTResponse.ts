import { HoppRESTRequest } from "./HoppRESTRequest"

export type HoppRESTResponse =
  | { type: "loading"; req: HoppRESTRequest | undefined }
  | {
      type: "fail"
      headers: { key: string; value: string }[]
      body: ArrayBuffer
      statusCode: number

      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest | undefined
    }
  | {
      type: "network_fail"
      error: Error

      req: HoppRESTRequest | undefined
    }
  | {
      type: "success"
      headers: { key: string; value: string }[]
      body: ArrayBuffer
      statusCode: number
      meta: {
        responseSize: number // in bytes
        responseDuration: number // in millis
      }

      req: HoppRESTRequest | undefined
    }
