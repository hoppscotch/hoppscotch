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
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
}
