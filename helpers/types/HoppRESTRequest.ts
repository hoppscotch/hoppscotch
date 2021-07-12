export type HoppRESTParam = {
  key: string
  value: string
  active: boolean
}

export interface HoppRESTRequest {
  method: string
  endpoint: string
  params: HoppRESTParam[]
}
