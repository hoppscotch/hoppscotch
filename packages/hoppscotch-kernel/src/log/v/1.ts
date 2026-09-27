import type { VersionedAPI } from "@type/versioning"
import * as E from "fp-ts/Either"

export type LogLevel = "debug" | "info" | "warn" | "error"

// "console": writes to the browser console (fire-and-forget, no retrieval)
// "file":    writes to disk via Tauri append_log (desktop only)
// "buffer":  in-memory circular buffer for log introspection. backs future
//            retrieval APIs (getLogs(), getLogsByTag()) for in-app diagnostics,
//            "send logs to support" flows, and test assertions. web declares
//            ["console", "buffer"], desktop declares all three
export type LogCapability = "console" | "file" | "buffer"

export type LogError =
  | { kind: "init"; message: string; cause?: unknown }
  | { kind: "write"; message: string; cause?: unknown }

export interface LogV1 {
  readonly id: string
  readonly capabilities: Set<LogCapability>

  // on web this is a no-op. on desktop it opens/creates the log file
  // at `logPath` for persistent logging
  init(logPath: string): Promise<E.Either<LogError, void>>

  // fire-and-forget: logging should never block the caller.
  // on web writes to console only. on desktop writes to console and file
  log(
    logPath: string,
    level: LogLevel,
    tag: string,
    message: string,
    data?: unknown
  ): Promise<void>
}

export const v1: VersionedAPI<LogV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "default",
    capabilities: new Set(),

    init: async () => E.left({ kind: "init", message: "Not implemented" }),
    log: async () => {},
  },
}
