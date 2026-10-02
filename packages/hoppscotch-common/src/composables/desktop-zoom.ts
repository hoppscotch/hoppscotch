import { watch, type WatchStopHandle } from "vue"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
// Relative imports rather than the `~/` alias because this module is
// consumed by both the web entry (where `~` resolves to common's src)
// and the desktop shell entry (where `~` resolves to the shell's own
// src). The package-name alias `@hoppscotch/common/...`
// would work under Vite dev (which honors pnpm symlinks via esbuild)
// but fails under Rollup build, which treats the rewritten
// `@hoppscotch/common/src/...` as an unresolved package specifier.
// Relative paths resolve identically under TS, both Vite configs, and
// the production build.
import { useDesktopSettings } from "./desktop-settings"
import { Log } from "../kernel/log"

const LOG_TAG = "useDesktopZoomEffect"

/**
 * Applies the persisted desktop `zoomLevel` to the current Tauri webview
 * and keeps it in sync with the setting.
 *
 * Each desktop entry point calls this once during startup. The launcher
 * window and the bundled web window each get their own invocation, and
 * each watcher addresses its own window through
 * `getCurrentWebviewWindow()`, which is the only window the webview can
 * see. The settings store is the shared source of truth between the two
 * windows, so a write in one reaches the other through the unified store
 * watch that `useDesktopSettings()` already maintains, and each window's
 * own watcher then re-applies the zoom locally.
 *
 * The watcher tracks both `loaded` and `zoomLevel` and skips the apply
 * until `loaded` flips true. A naive `{ immediate: true }` on `zoomLevel`
 * alone would fire synchronously with the schema default (1.0) before
 * `loadInitial()` hydrates from disk, undoing any Rust-side pre-mount
 * apply on the bundled window. For a user persisted at `1.5`, the
 * sequence would be Rust paints 1.5, JS immediate apply runs setZoom(1.0)
 * and overrides it, then `loadInitial()` resolves and the watcher fires
 * again with 1.5, producing a 1.5 -> 1.0 -> 1.5 flash on every connect.
 * Gating on `loaded` means the first apply uses the persisted value
 * directly, leaving the pre-mount apply intact. Subsequent user edits
 * flow through the same watcher as ordinary reactive changes.
 */
export function useDesktopZoomEffect(): WatchStopHandle {
  const desktopSettings = useDesktopSettings()

  return watch(
    () =>
      [
        desktopSettings.loaded.value,
        desktopSettings.settings.zoomLevel,
      ] as const,
    async ([isLoaded, factor]) => {
      if (!isLoaded) return
      try {
        await getCurrentWebviewWindow().setZoom(factor)
      } catch (err) {
        // setZoom can reject on Linux WebKitGTK when called very early
        // in the window lifecycle, before the webview is fully attached.
        // The next change re-applies, and a fresh launch retries via the
        // initial fire of this same watcher after `loaded` flips true.
        Log.warn(LOG_TAG, `setZoom(${factor}) failed`, err)
      }
    },
    { immediate: true }
  )
}
