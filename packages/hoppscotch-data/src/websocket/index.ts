import { ValidRealtimeContentTypes } from "./content-types";

export * from "./content-types";

export const WS_REQ_SCHEMA_VERSION = 1

export type HoppWSProtocol = {
  value: string,
  active: boolean
}

export type HoppWSPayload = {
  contentType: ValidRealtimeContentTypes,
  body: string
}

export type HoppWSCommand = {
  id?: string
  v: number
  url: string
  protocols: HoppWSProtocol[],
  payload: HoppWSPayload,
}

export function makeWSCommand(x: Omit<HoppWSCommand, "v">): HoppWSCommand {
  return {
    v: WS_REQ_SCHEMA_VERSION,
    ...x,
  }
}
