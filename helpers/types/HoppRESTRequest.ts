export type HoppRESTParam = {
  key: string
  value: string
  active: boolean
}

export interface HoppRESTRequest {
  endpoint: string
  params: HoppRESTParam[]
}
