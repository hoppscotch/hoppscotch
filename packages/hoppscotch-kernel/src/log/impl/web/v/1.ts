import * as E from "fp-ts/Either"

import type { VersionedAPI } from "@type/versioning"
import type { LogV1, LogLevel } from "@log/v/1"

// in-memory buffer backing the "buffer" capability (see LogCapability).
// console.log is fire-and-forget with no retrieval path (no console.getAll()),
// so this buffer exists for log introspection: future kernel log iterations
// will expose retrieval APIs (getLogs(), getLogsByTag()) for in-app
// diagnostics, "send logs to support" flows, and test assertions.
//
// the window assignment below is an intentional debugging hatch so the
// buffer can be inspected from DevTools. it will be internalized once the
// proper kernel retrieval API lands, but the buffer itself stays as a
// declared capability in v1
const buffer: string[] = []

if (typeof window !== "undefined") {
  ;(window as any).__DIAG_LOGS__ = buffer
  ;(window as any).__dumpDiagLogs__ = () => buffer.join("\n")
}

class BrowserLogManager {
  private static instance: BrowserLogManager

  private constructor() {}

  static new(): BrowserLogManager {
    if (!BrowserLogManager.instance) {
      BrowserLogManager.instance = new BrowserLogManager()
    }
    return BrowserLogManager.instance
  }

  private format(
    level: string,
    tag: string,
    message: string,
    data?: unknown
  ): string {
    const ts = new Date().toISOString()
    const dataPart =
      data !== undefined
        ? ` ${
            typeof data === "string"
              ? data
              : (() => {
                  try {
                    return JSON.stringify(data)
                  } catch {
                    return String(data)
                  }
                })()
          }`
        : ""
    return `[${ts}] [${level.toUpperCase()}] [${tag}] ${message}${dataPart}`
  }

  log(level: string, tag: string, message: string, data?: unknown): void {
    const line = this.format(level, tag, message, data)

    // write to appropriate console method
    if (level === "debug") console.debug(line)
    else if (level === "warn") console.warn(line)
    else if (level === "error") console.error(line)
    else console.log(line)

    // push to in-memory buffer
    buffer.push(line)
    if (buffer.length > 5000) buffer.splice(0, buffer.length - 5000)
  }
}

export const implementation: VersionedAPI<LogV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "browser-log",
    capabilities: new Set(["console", "buffer"]),

    // web doesn't need file init, but the API is consistent
    async init(_logPath: string) {
      return E.right(undefined)
    },

    async log(
      _logPath: string,
      level: LogLevel,
      tag: string,
      message: string,
      data?: unknown
    ) {
      const manager = BrowserLogManager.new()
      manager.log(level, tag, message, data)
    },
  },
}
