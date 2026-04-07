import { implementation as logV1 } from "./v/1"

export const LOG_IMPLS = {
  v1: logV1,
} as const
