// kernel log wrapper. same setup as store.ts: delegates to the kernel
// log module, which on web writes to console and on desktop writes to
// console and a log file on disk.
//
// usage:
//   import { diag } from "~/kernel/log"
//   diag("store", "STORE_PATH resolved to", storePath)
//
//   import { Log } from "~/kernel/log"
//   Log.info("persistence", "settings loaded", { theme: "dark" })
//   Log.error("auth", "token refresh failed", error.message)
//
// NOTE: this file intentionally does not import from "." (kernel/index.ts)
// or from "./store". store.ts imports `diag` from this file and calls it
// at module evaluation time. any static import back into the barrel
// (index.ts) would create a circular dependency that causes a TDZ error
// at bundle time. instead we access `window.__KERNEL__` directly

const LOG_FILE_NAME = "io.hoppscotch.desktop.diag.log"

// in-memory buffer that works even before the kernel is initialized.
// the kernel log impls maintain their own buffers on `window.__DIAG_LOGS__`
// once they take over, but early entries (before `initKernel()`) land here.
//
// the window assignment is an intentional debugging hatch for DevTools
// inspection, same as the kernel impls (see kernel/log/impl/web/v/1.ts
// for full rationale). will be internalized once the kernel exposes
// proper retrieval APIs (getLogs(), getLogsByTag())
const earlyBuffer: string[] = []

if (typeof window !== "undefined") {
  ;(window as any).__DIAG_LOGS__ = earlyBuffer
  ;(window as any).__dumpDiagLogs__ = () => earlyBuffer.join("\n")
}

// the log "path" passed through the kernel API is just the filename.
// on desktop, the Rust `append_log` command joins it with `logs_dir()`
// (from path.rs) so the JS side never needs to resolve directories.
// on web the filename is unused but the API requires one
const getLogPath = (): string => LOG_FILE_NAME

// access the kernel log module directly from `window.__KERNEL__` instead
// of importing `getModule` from the barrel. returns null if the kernel
// hasn't been initialized yet (normal during module evaluation, since
// `diag()` is called at top level in store.ts before `initKernel()`)
const tryModule = () => {
  if (typeof window === "undefined") return null
  const kernel = window.__KERNEL__
  return kernel?.log ?? null
}

type LogLevel = "debug" | "info" | "warn" | "error"

const formatLine = (level: string, tag: string, ...args: unknown[]): string => {
  const ts = new Date().toISOString()
  const parts = args.map((a) => {
    if (typeof a === "string") return a
    try {
      return JSON.stringify(a)
    } catch {
      return String(a)
    }
  })
  return `[${ts}] [${level.toUpperCase()}] [${tag}] ${parts.join(" ")}`
}

const logAtLevel = async (
  level: LogLevel,
  tag: string,
  ...args: unknown[]
): Promise<void> => {
  const mod = tryModule()

  if (mod) {
    // kernel is ready, delegate to it (console + file on desktop)
    const logPath = getLogPath()
    const message = args
      .map((a) => {
        if (typeof a === "string") return a
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      })
      .join(" ")
    await mod.log(logPath, level, tag, message)
  } else {
    // kernel not ready yet (module eval time). write to console and
    // buffer directly so nothing is lost
    const line = formatLine(level, tag, ...args)
    if (level === "debug") console.debug(line)
    else if (level === "warn") console.warn(line)
    else if (level === "error") console.error(line)
    else console.log(line)
    earlyBuffer.push(line)
    if (earlyBuffer.length > 5000)
      earlyBuffer.splice(0, earlyBuffer.length - 5000)
  }
}

// on web: writes to console + in-memory buffer.
// on desktop: writes to console + in-memory buffer + log file on disk
export const Log = {
  // initialize the file logger (desktop only). call once during app
  // startup, after `initKernel()`. flushes any entries that were buffered
  // before the kernel was ready (module-eval-time `diag()` calls) so they
  // make it to the log file on disk. on web the init is a no-op but the
  // drain still feeds the kernel's in-memory buffer
  init: async () => {
    const mod = tryModule()
    if (!mod) throw new Error("Log.init() called before initKernel()")
    const logPath = getLogPath()
    const result = await mod.init(logPath)

    // drain early buffer entries through the kernel log module so they
    // end up in the log file on desktop (they were only in console before)
    if (earlyBuffer.length > 0) {
      for (const line of earlyBuffer) {
        await mod.log(logPath, "info", "early", line)
      }
      earlyBuffer.length = 0
    }

    return result
  },

  debug: (tag: string, ...args: unknown[]) => logAtLevel("debug", tag, ...args),
  info: (tag: string, ...args: unknown[]) => logAtLevel("info", tag, ...args),
  warn: (tag: string, ...args: unknown[]) => logAtLevel("warn", tag, ...args),
  error: (tag: string, ...args: unknown[]) => logAtLevel("error", tag, ...args),
} as const

// convenience alias for `Log.info`. drop-in replacement for the old
// `diag()` function so existing call sites only need to change the
// import path, not the function name
export function diag(tag: string, ...args: unknown[]): void {
  // fire-and-forget: diag should never block the caller
  logAtLevel("info", tag, ...args).catch(() => {})
}
