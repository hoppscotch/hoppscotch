import type { HoppGRPCRequest } from "@hoppscotch/data"
import type { GRPCUnaryResponse } from "./types"

export type GRPCOptionTab = "body" | "metadata" | "proto"

export type HoppGRPCDocument = {
  request: HoppGRPCRequest
  isDirty: boolean
  response?: GRPCUnaryResponse | null
  error?: string | null
  optionTabPreference?: GRPCOptionTab
}
