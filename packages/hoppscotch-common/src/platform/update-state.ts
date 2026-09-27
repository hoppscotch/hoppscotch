import { z } from "zod"

/**
 * Shared schema and types for the desktop app's auto-updater state.
 *
 * The updater state is written to `tauri-plugin-store` by the Tauri shell
 * (`hoppscotch-desktop/src/utils/updater.ts`) and read by both the shell's
 * persistence service and the webview's settings page. This module is the
 * single source of truth for the definition that crosses all three
 * boundaries (Rust, shell JS, webview JS via the store file).
 *
 * Persisted form is deliberately flat (status + optional fields). The
 * webview's `useUpdateCheck` composable derives a discriminated union
 * over this flat form for its internal state, but the wire format that
 * hits disk stays simple so existing Rust writers continue to work
 * unchanged.
 */

// Store coordinates. Both the shell persistence service and the webview
// composable reference these constants rather than string literals.
export const UPDATE_STATE_STORE_NAMESPACE = "hoppscotch-desktop.v1"
export const UPDATE_STATE_STORE_KEY = "updateState"

// `UpdateStatus` as a `const` object rather than a TS `enum` so:
//   1. The values are plain string literals, so they cross the store
//      boundary as JSON without extra conversion.
//   2. The inferred union type (`"idle" | "checking" | ...`) narrows
//      cleanly in switch statements and matches Zod's `z.enum` output.
//   3. It imports zero-cost into the webview bundle, where TS enums can
//      produce runtime objects that tree-shaking sometimes fails to drop.
export const UpdateStatus = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  NOT_AVAILABLE: "not_available",
  DOWNLOADING: "downloading",
  INSTALLING: "installing",
  READY_TO_RESTART: "ready_to_restart",
  ERROR: "error",
} as const

export type UpdateStatus = (typeof UpdateStatus)[keyof typeof UpdateStatus]

export const UPDATE_STATUS_SCHEMA = z.enum([
  UpdateStatus.IDLE,
  UpdateStatus.CHECKING,
  UpdateStatus.AVAILABLE,
  UpdateStatus.NOT_AVAILABLE,
  UpdateStatus.DOWNLOADING,
  UpdateStatus.INSTALLING,
  UpdateStatus.READY_TO_RESTART,
  UpdateStatus.ERROR,
])

export const DOWNLOAD_PROGRESS_SCHEMA = z.object({
  downloaded: z.number(),
  total: z.number().optional(),
})

export type DownloadProgress = z.infer<typeof DOWNLOAD_PROGRESS_SCHEMA>

export const UPDATE_STATE_SCHEMA = z.object({
  status: UPDATE_STATUS_SCHEMA,
  version: z.string().optional(),
  message: z.string().optional(),
  progress: DOWNLOAD_PROGRESS_SCHEMA.optional(),
})

export type UpdateState = z.infer<typeof UPDATE_STATE_SCHEMA>
