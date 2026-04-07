import { v1 } from "./v/1"

export type { LogV1, LogLevel, LogCapability, LogError } from "./v/1"

export const VERSIONS = {
  v1,
} as const

export const latest = v1
