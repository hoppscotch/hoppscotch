export type HoppRESTResponse =
  | { type: "loading" }
  | {
      type: "fail"
      headers: { key: string; value: string }[]
      body: ArrayBuffer
      statusCode: number
    }
  | {
      type: "network_fail"
      error: Error
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
    }
