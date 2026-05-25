import { reactive, ref, readonly } from "vue"
import * as E from "fp-ts/Either"
import { invoke } from "@tauri-apps/api/core"

// Bind to the unified, process-wide store rather than the org-scoped
// default `Store`. Desktop settings are machine-level configuration
// (for example the "disable update checks" toggle), and the Tauri
// shell reads them through its own `kernel/store.ts` wrapper at the
// same physical path. Going through the org-scoped store would route
// writes to a different file and the shell would never see them.
import { UnifiedStore as Store } from "~/kernel/store"
import {
  DESKTOP_SETTINGS_SCHEMA,
  DESKTOP_SETTINGS_STORE_KEY,
  DESKTOP_SETTINGS_STORE_NAMESPACE,
  parseDesktopSettings,
  type DesktopSettings,
} from "~/platform/desktop-settings"
import { setKeyboardLayoutStrategy } from "~/helpers/keyboard-strategy"
import { Log } from "~/kernel/log"

const LOG_TAG = "useDesktopSettings"

/**
 * Webview-side accessor for the desktop-app user settings.
 *
 * Reads and writes through `tauri-plugin-store` under the same namespace
 * and key as the Tauri shell's persistence service, and mirrors every
 * webview-originated write into the Rust-side `DESKTOP_CONFIG` mailbox
 * via the `set_desktop_config` Tauri command.
 *
 * Why the webview handles its own Rust sync rather than relying on the
 * shell's watch-based sync: the shell window closes once `appload` loads
 * this webview bundle, which tears down the shell's persistence service
 * and its watch subscription. Writes made after that point have no shell
 * listener to forward them, so the webview owns the sync for its own
 * lifetime. The shell's sync handles initial prime at app startup plus
 * any shell-originated writes (the portable welcome screen) during its
 * short pre-webview life.
 *
 * `update(key, value)` is transactional: the reactive object is mutated
 * first so callers see an optimistic update, but a persist failure rolls
 * the reactive back to its previous value and rethrows, so in-memory
 * state never drifts from what's in the store.
 *
 * Module-level singleton: every caller shares the same reactive object
 * so the settings section and any other consumer bound to these values
 * stay coherent.
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
  // Open the unified store before reading. The shell already inits this
  // path through its own `DesktopPersistenceService.init`, but the
  // webview runs in a separate window with its own process state, so
  // the underlying Tauri store still needs to be opened here. Repeat
  // calls land on the same on-disk file and are harmless.
  const initResult = await Store.init()
  if (E.isLeft(initResult)) {
    Log.warn(LOG_TAG, "Failed to init unified store", initResult.left)
  }

  const result = await Store.get<unknown>(
    DESKTOP_SETTINGS_STORE_NAMESPACE,
    DESKTOP_SETTINGS_STORE_KEY
  )
  const raw = E.isRight(result) ? result.right : undefined
  Object.assign(settings, parseDesktopSettings(raw))
  setKeyboardLayoutStrategy(settings.keyboardLayoutStrategy)
  loaded.value = true

  // Subscribe to external writes (for example the Tauri shell's portable
  // welcome screen) so the reactive object stays current. One subscription
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
        setKeyboardLayoutStrategy(settings.keyboardLayoutStrategy)
      }
    })
  } catch (err) {
    Log.warn(LOG_TAG, "Failed to subscribe to store", err)
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
    // `StoreError` is a tagged union. Formatting `kind` and `message`
    // explicitly keeps the thrown error readable. A plain
    // `${writeResult.left}` interpolation stringifies to
    // `[object Object]` and hides the actual cause from stack traces.
    const err = writeResult.left
    Log.error(LOG_TAG, "Failed to write desktopSettings", err)
    throw new Error(
      `Failed to write desktopSettings: ${err.kind}: ${err.message}`
    )
  }

  // Mirror to Rust. Non-fatal on failure because Rust falls back to
  // its compile-time defaults when the mailbox is empty, so a missed
  // sync degrades to "Rust reads an older value" rather than rejecting
  // the write the user already committed to.
  try {
    await invoke("set_desktop_config", { config: validated })
  } catch (err) {
    Log.warn(LOG_TAG, "Failed to push DesktopSettings to Rust", err)
  }
}

export function useDesktopSettings(): {
  /** Reactive settings object. Read-only externally, bind via refs in templates. */
  settings: Readonly<DesktopSettings>
  /** True once the initial store read has completed. */
  loaded: Readonly<typeof loaded>
  /** Updates a single setting and persists immediately, rolling back on failure. */
  update: UpdateFn
} {
  if (!initPromise) {
    initPromise = loadInitial().catch((err) => {
      Log.error(LOG_TAG, "Initial load failed", err)
      // Swallow so repeat calls retry on next `update()`.
      initPromise = undefined
      throw err
    })
  }

  const update: UpdateFn = async (key, value) => {
    // Wait for the initial load before mutating. Without this, a
    // user clicking a toggle immediately after mount could interleave
    // with `loadInitial()`: the optimistic mutation and persist would
    // land first, and then `loadInitial()` would resolve and call
    // `Object.assign(settings, ...)` with the old on-disk value,
    // overwriting the user's change in memory.
    if (initPromise) {
      try {
        await initPromise
      } catch {
        // Load failed. The caller's `update` will still attempt a
        // persist below, which is the right behaviour: the user
        // wants their change saved even if the initial read failed.
      }
    }

    const previous = settings[key]
    settings[key] = value
    // Mirror the change into the keyboard-strategy holder eagerly so the
    // next keypress respects the new strategy without waiting for the
    // store-watch callback to round-trip. The watch fires later with the
    // same value, and the redundant write is cheap.
    if (key === "keyboardLayoutStrategy") {
      setKeyboardLayoutStrategy(
        value as DesktopSettings["keyboardLayoutStrategy"]
      )
    }
    try {
      await persist()
    } catch (err) {
      // Restore the reactive state so the in-memory view reflects what's
      // actually in the store. Without this, a failed persist leaves the
      // settings object holding a value the next app start will not find.
      settings[key] = previous
      if (key === "keyboardLayoutStrategy") {
        setKeyboardLayoutStrategy(
          previous as DesktopSettings["keyboardLayoutStrategy"]
        )
      }
      throw err
    }
  }

  return {
    settings: readonly(settings) as Readonly<DesktopSettings>,
    loaded: readonly(loaded),
    update,
  }
}
