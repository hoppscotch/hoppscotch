import { reactive, ref, readonly } from "vue"
import * as E from "fp-ts/Either"
import { invoke } from "@tauri-apps/api/core"

import { Store } from "@app/kernel/store"
import {
  DESKTOP_SETTINGS_SCHEMA,
  DESKTOP_SETTINGS_STORE_KEY,
  DESKTOP_SETTINGS_STORE_NAMESPACE,
  parseDesktopSettings,
  type DesktopSettings,
} from "@hoppscotch/common/platform/desktop-settings"

/**
 * Webview-side accessor for the desktop-app user settings.
 *
 * Reads and writes through `tauri-plugin-store` under the same namespace/key
 * that the Tauri shell's `DesktopPersistenceService` uses. After every write,
 * also pushes the settings to Rust via the `set_desktop_config` command so
 * live Rust consumers (e.g. the appload client's connection timeout) stay in
 * sync without a restart.
 *
 * Module-level singleton: every caller gets the same reactive object so the
 * settings section and any future status badges in the app chrome stay
 * coherent.
 */

type UpdateFn = <K extends keyof DesktopSettings>(
  key: K,
  value: DesktopSettings[K]
) => Promise<void>

// Singleton state, initialized on first `useDesktopSettings()` call.
const settings = reactive<DesktopSettings>(DESKTOP_SETTINGS_SCHEMA.parse({}))
const loaded = ref(false)
let initPromise: Promise<void> | undefined

async function loadInitial(): Promise<void> {
  const result = await Store.get<unknown>(
    DESKTOP_SETTINGS_STORE_NAMESPACE,
    DESKTOP_SETTINGS_STORE_KEY
  )
  const raw = E.isRight(result) ? result.right : undefined
  Object.assign(settings, parseDesktopSettings(raw))
  loaded.value = true

  // Subscribe to external writes, for example the Tauri shell's portable
  // welcome screen, so the reactive object stays current. One subscription
  // per process is enough because the reactive object is a module-level
  // singleton.
  try {
    const emitter = await Store.watch(
      DESKTOP_SETTINGS_STORE_NAMESPACE,
      DESKTOP_SETTINGS_STORE_KEY
    )
    emitter.on("change", ({ value }: { value?: unknown }) => {
      if (value !== undefined) {
        Object.assign(settings, parseDesktopSettings(value))
      }
    })
  } catch (err) {
    console.warn("[useDesktopSettings] Failed to subscribe to store:", err)
  }
}

async function persist(): Promise<void> {
  const validated = DESKTOP_SETTINGS_SCHEMA.parse(settings)
  const writeResult = await Store.set(
    DESKTOP_SETTINGS_STORE_NAMESPACE,
    DESKTOP_SETTINGS_STORE_KEY,
    validated
  )
  if (E.isLeft(writeResult)) {
    console.error(
      "[useDesktopSettings] Failed to write desktopSettings:",
      writeResult.left
    )
    throw new Error(`Failed to write desktopSettings: ${writeResult.left}`)
  }

  // Keep the Rust-side mirror in sync for live consumers. Non-fatal on
  // failure, Rust falls back to compile-time defaults in that case.
  try {
    await invoke("set_desktop_config", { config: validated })
  } catch (err) {
    console.warn(
      "[useDesktopSettings] Failed to push DesktopSettings to Rust:",
      err
    )
  }
}

export function useDesktopSettings(): {
  /** Reactive settings object. Read-only externally, bind via refs in templates. */
  settings: Readonly<DesktopSettings>
  /** True once the initial store read has completed. */
  loaded: Readonly<typeof loaded>
  /** Updates a single setting and persists immediately. */
  update: UpdateFn
} {
  if (!initPromise) {
    initPromise = loadInitial().catch((err) => {
      console.error("[useDesktopSettings] Initial load failed:", err)
      // Swallow so repeat calls retry on next `update()`.
      initPromise = undefined
      throw err
    })
  }

  const update: UpdateFn = async (key, value) => {
    settings[key] = value
    await persist()
  }

  return {
    settings: readonly(settings) as Readonly<DesktopSettings>,
    loaded: readonly(loaded),
    update,
  }
}
