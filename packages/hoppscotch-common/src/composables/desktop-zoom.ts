import { watch, type WatchStopHandle } from "vue"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
// Relative imports rather than the `~/` alias because this module is
// consumed by both the selfhost-web entry (where `~` resolves to
// common's src) and the desktop shell entry (where `~` resolves to the
// shell's own src). The package-name alias `@hoppscotch/common/...`
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
 * window (`hoppscotch-desktop/src/main.ts`) and the bundled selfhost-web
 * window (`hoppscotch-selfhost-web/src/main.ts`) each get their own
 * invocation, and each watcher addresses its own window through
 * `getCurrentWebviewWindow()`, which is the only window the webview can
 * see. The settings store is the shared source of truth between the two
 * windows, so a write in one reaches the other through the unified store
 * watch that `useDesktopSettings()` already maintains, and each window's
 * own watcher then re-applies the zoom locally.
 *
 * `{ immediate: true }` fires once with the schema default before the
 * initial store read completes, then again with the user's persisted value
 * once `loadInitial()` resolves. The first apply is a no-op when the user
 * has no override, and a brief 100% flash otherwise. The companion
 * Rust-side pre-mount apply in `tauri-plugin-appload` closes that flash
 * for the bundled window. The launcher window has no equivalent flash
 * because it always renders the shell's own minimal UI which is small
 * enough that the apply lands before the user sees content.
 */
export function useDesktopZoomEffect(): WatchStopHandle {
  const desktopSettings = useDesktopSettings()

  return watch(
    () => desktopSettings.settings.zoomLevel,
    async (factor) => {
      try {
        await getCurrentWebviewWindow().setZoom(factor)
      } catch (err) {
        // setZoom can reject on Linux WebKitGTK when called very early in
        // the window lifecycle, before the webview is fully attached. The
        // next change re-applies, and a fresh launch retries via the
        // initial fire of this same watcher.
        Log.warn(LOG_TAG, `setZoom(${factor}) failed`, err)
      }
    },
    { immediate: true }
  )
}
