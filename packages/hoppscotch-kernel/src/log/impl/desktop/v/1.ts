import * as E from "fp-ts/Either"

import type { VersionedAPI } from "@type/versioning"
import type { LogV1, LogLevel } from "@log/v/1"

// in-memory buffer backing the "buffer" capability (same as web impl).
// see impl/web/v/1.ts for the full rationale. on desktop the buffer
// supplements the disk log: disk gives persistence, buffer gives
// programmatic retrieval for future kernel APIs (getLogs(), getLogsByTag())
//
// window assignment is an intentional debugging hatch for DevTools
// inspection. will be internalized once the kernel retrieval API lands
const buffer: string[] = []

if (typeof window !== "undefined") {
  ;(window as any).__DIAG_LOGS__ = buffer
  ;(window as any).__dumpDiagLogs__ = () => buffer.join("\n")
}

const FLUSH_INTERVAL_MS = 500

// lazy-loaded Tauri invoke. loaded once, shared across all instances
let invoke:
  | (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>)
  | null = null
let invokePromise: Promise<void> | null = null

const ensureInvoke = async () => {
  if (invoke) return
  if (!invokePromise) {
    invokePromise = import("@tauri-apps/api/core").then((m) => {
      invoke = m.invoke
    })
  }
  await invokePromise
}

class TauriLogManager {
  private static instances: Map<string, TauriLogManager> = new Map()

  // the filename (not full path) passed to the Rust `append_log` command.
  // the Rust side joins this with `logs_dir()` so writes are always
  // confined to the correct directory regardless of build type
  private filename: string
  private initialized = false
  private pendingWrites: string[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  private constructor(filename: string) {
    this.filename = filename
  }

  static new(filename: string): TauriLogManager {
    if (TauriLogManager.instances.has(filename)) {
      return TauriLogManager.instances.get(filename)!
    }
    const instance = new TauriLogManager(filename)
    TauriLogManager.instances.set(filename, instance)
    return instance
  }

  async init(): Promise<void> {
    if (this.initialized) return

    try {
      await ensureInvoke()

      // write a session header so we know which webview this came from
      const orgCtx =
        new URLSearchParams(window.location.search).get("org") ?? "(none)"
      const header = [
        "",
        "=".repeat(72),
        `LOG SESSION START  ${new Date().toISOString()}`,
        `  org context : ${orgCtx}`,
        `  href        : ${window.location.href}`,
        `  host        : ${window.location.host}`,
        `  __KERNEL__  : ${window.__KERNEL__ ? "present" : "MISSING"}`,
        "=".repeat(72),
        "",
      ].join("\n")

      await invoke!("append_log", {
        filename: this.filename,
        content: header,
      })

      this.initialized = true

      // flush any writes that accumulated before init completed
      if (this.pendingWrites.length > 0) {
        this.scheduleFlush()
      }
    } catch (err) {
      console.warn("[kernel-log] Failed to initialize file logger:", err)
    }
  }

  private async flush(): Promise<void> {
    if (!invoke || this.pendingWrites.length === 0) return

    const batch = this.pendingWrites.join("\n") + "\n"
    const snapshot = this.pendingWrites
    this.pendingWrites = []

    try {
      await invoke("append_log", {
        filename: this.filename,
        content: batch,
      })
    } catch (err) {
      // re-queue failed entries (prepend before any new writes that
      // accumulated during the await) so they're retried on next flush
      this.pendingWrites = snapshot.concat(this.pendingWrites)
      console.warn("[kernel-log] Failed to flush logs to disk:", err)
      this.scheduleFlush()
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, FLUSH_INTERVAL_MS)
  }

  log(level: string, tag: string, message: string, data?: unknown): void {
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
    const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${message}${dataPart}`

    // 1. console (same as web)
    if (level === "debug") console.debug(line)
    else if (level === "warn") console.warn(line)
    else if (level === "error") console.error(line)
    else console.log(line)

    // 2. in-memory buffer
    buffer.push(line)
    if (buffer.length > 5000) buffer.splice(0, buffer.length - 5000)

    // 3. file (batched)
    this.pendingWrites.push(line)
    this.scheduleFlush()
  }
}

export const implementation: VersionedAPI<LogV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "tauri-log",
    capabilities: new Set(["console", "file", "buffer"]),

    async init(logPath: string) {
      try {
        const manager = TauriLogManager.new(logPath)
        await manager.init()
        return E.right(undefined)
      } catch (error) {
        return E.left({
          kind: "init",
          message: error instanceof Error ? error.message : "Unknown error",
          cause: error,
        })
      }
    },

    async log(
      logPath: string,
      level: LogLevel,
      tag: string,
      message: string,
      data?: unknown
    ) {
      const manager = TauriLogManager.new(logPath)
      manager.log(level, tag, message, data)
    },
  },
}
