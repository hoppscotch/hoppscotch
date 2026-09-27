import { ref, readonly, type Ref } from "vue"
import * as E from "fp-ts/Either"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

// Bind to the unified, process-wide store rather than the org-scoped
// default `Store`. Persisted `UpdateState` is machine-level, not
// per-org, and the Tauri shell reads the same physical file through
// its own `kernel/store.ts` wrapper. Going through the org-scoped
// store would route writes to a file the shell never reads.
import { UnifiedStore as Store } from "~/kernel/store"
import {
  UPDATE_STATE_SCHEMA,
  UPDATE_STATE_STORE_KEY,
  UPDATE_STATE_STORE_NAMESPACE,
  type DownloadProgress as WireDownloadProgress,
  type UpdateState as PersistedUpdateState,
} from "~/platform/update-state"
import { Log } from "~/kernel/log"

const LOG_TAG = "useUpdateCheck"

/**
 * Webview-side accessor for the desktop updater.
 *
 * Wraps the Tauri updater commands (`check_for_updates`,
 * `download_and_install_update`, `restart_application`, `cancel_update`)
 * and the `updater-event` Tauri channel into a single reactive accessor.
 *
 * State is modelled as a discriminated union where each variant carries
 * exactly the fields that variant needs (the `available` variant carries
 * `latestVersion`, the `downloading` variant carries `progress`, and so
 * on). Impossible combinations ("available without a version", "not
 * downloading but progress is set") are unrepresentable by construction,
 * and callers narrow through `state.kind`.
 *
 * State transitions are owned by a single pure `applyEvent` function
 * driven by the `updater-event` channel. Action wrappers (`check`,
 * `download`, `restart`, `cancel`) await initialization before invoking
 * so the listener is guaranteed to be subscribed before any command
 * fires, and rely on the event stream for the transitions rather than
 * mutating state themselves. This removes the "fast path + event" drift
 * that made two paths responsible for updating the same refs.
 *
 * Module-level singleton: every caller gets the same reactive state so
 * any consumer (settings page, portable welcome, startup flow) sees the
 * same value.
 */

// Download progress with a derived `percentage`. The wire form from
// Rust and the persisted form only carry `downloaded` and optional
// `total`. The `percentage` is computed on top so the UI has a
// ready-to-bind field.
export interface DownloadProgress extends WireDownloadProgress {
  percentage: number
}

// Response from the `check_for_updates` Tauri command. Used only to
// invoke the command. Actual state transitions arrive on the event
// channel.
interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
}

// Tauri event payload variants. Must match the `UpdateEvent` tagged union in
// `hoppscotch-desktop/src/services/updater.client.ts`. Centralizing this
// type into common would remove the duplication, but the event channel is
// a Rust-to-webview wire contract that currently lives in the shell, so
// keeping the mirror here scoped to this composable is acceptable until
// that contract gets its own shared module.
type UpdateEvent =
  | { type: "CheckStarted" }
  | { type: "CheckCompleted"; info: UpdateInfo }
  | { type: "CheckFailed"; error: string }
  | { type: "DownloadStarted"; totalBytes?: number }
  // The Rust-emitted payload only carries `downloaded` and optional
  // `total`. The reducer derives `percentage` and the persisted
  // `DownloadProgress` form below extends with that derived field.
  | { type: "DownloadProgress"; progress: WireDownloadProgress }
  | { type: "DownloadCompleted" }
  | { type: "InstallStarted" }
  | { type: "InstallCompleted" }
  | { type: "RestartRequired" }
  | { type: "UpdateCancelled" }
  | { type: "Error"; message: string }

// The composable's internal state. Each variant carries exactly the
// fields that variant needs. `currentVersion` rides along with any
// post-check variant so the UI can display "currently on vX" context
// regardless of whether an update was found.
export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | {
      kind: "available"
      currentVersion: string
      latestVersion: string
    }
  | { kind: "not_available"; currentVersion: string }
  | { kind: "downloading"; progress: DownloadProgress }
  | { kind: "installing" }
  | { kind: "ready_to_restart" }
  | { kind: "error"; message: string }

// String-literal helper for consumers that want to compare without
// destructuring `state.kind` directly. `UpdateState["kind"]` gives the
// same union at the type level.
export const UpdateKind = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  NOT_AVAILABLE: "not_available",
  DOWNLOADING: "downloading",
  INSTALLING: "installing",
  READY_TO_RESTART: "ready_to_restart",
  ERROR: "error",
} as const satisfies Record<string, UpdateState["kind"]>

// Singleton state.
const state = ref<UpdateState>({ kind: "idle" })
let initPromise: Promise<void> | undefined
let unlistenFn: UnlistenFn | undefined

function percentageOf(downloaded: number, total: number | undefined): number {
  if (!total || total <= 0) return 0
  return (downloaded / total) * 100
}

/**
 * Derives the composable's internal `UpdateState` from the flat
 * persisted form. The persisted form is a wire contract with Rust and
 * older shell code, and translating on read keeps that contract
 * unchanged while the composable gets the richer internal type.
 */
function fromPersisted(
  persisted: PersistedUpdateState | null | undefined
): UpdateState {
  if (!persisted) return { kind: "idle" }

  switch (persisted.status) {
    case "idle":
      return { kind: "idle" }
    case "checking":
      return { kind: "checking" }
    case "available":
      // The persisted form is optional on `version`. If the writer
      // omitted it, fall back to idle rather than fabricating a version.
      return persisted.version
        ? {
            kind: "available",
            currentVersion: "",
            latestVersion: persisted.version,
          }
        : { kind: "idle" }
    case "not_available":
      return { kind: "not_available", currentVersion: "" }
    case "downloading": {
      const downloaded = persisted.progress?.downloaded ?? 0
      const total = persisted.progress?.total
      return {
        kind: "downloading",
        progress: {
          downloaded,
          total,
          percentage: percentageOf(downloaded, total),
        },
      }
    }
    case "installing":
      return { kind: "installing" }
    case "ready_to_restart":
      return { kind: "ready_to_restart" }
    case "error":
      return { kind: "error", message: persisted.message ?? "Unknown error" }
  }
}

/**
 * Pure reducer from current state + incoming event to next state. Kept
 * pure (no ref access, no side effects) so it can be exercised in
 * isolation and so the full transition table is readable at a glance.
 */
function nextState(current: UpdateState, event: UpdateEvent): UpdateState {
  switch (event.type) {
    case "CheckStarted":
      return { kind: "checking" }

    case "CheckCompleted":
      if (event.info.available && event.info.latestVersion) {
        return {
          kind: "available",
          currentVersion: event.info.currentVersion,
          latestVersion: event.info.latestVersion,
        }
      }
      return {
        kind: "not_available",
        currentVersion: event.info.currentVersion,
      }

    case "CheckFailed":
      return { kind: "error", message: event.error }

    case "DownloadStarted":
      return {
        kind: "downloading",
        progress: {
          downloaded: 0,
          total: event.totalBytes,
          percentage: 0,
        },
      }

    case "DownloadProgress":
      // The wire form has no `percentage`. Without computing it
      // here, `Math.round(progress.percentage)` in the view runs on
      // `undefined` and the button label renders "Downloading NaN%"
      // for every progress tick. `DownloadStarted` above takes the
      // same approach.
      return {
        kind: "downloading",
        progress: {
          downloaded: event.progress.downloaded,
          total: event.progress.total,
          percentage: percentageOf(
            event.progress.downloaded,
            event.progress.total
          ),
        },
      }

    case "DownloadCompleted":
      return { kind: "installing" }

    case "InstallStarted":
      return { kind: "installing" }

    case "InstallCompleted":
      // Install is a short step that transitions straight into awaiting a
      // restart. The `RestartRequired` event follows and flips the state,
      // so keep the current state here rather than double-transitioning.
      return current

    case "RestartRequired":
      return { kind: "ready_to_restart" }

    case "UpdateCancelled":
      return { kind: "idle" }

    case "Error":
      return { kind: "error", message: event.message }
  }
}

async function loadPersistedState(): Promise<void> {
  // Open the unified store before reading. The shell already opens
  // this path through `DesktopPersistenceService.init`, but the
  // webview runs in a separate window with its own process state, so
  // the underlying Tauri store still needs to be opened here. Repeat
  // calls land on the same on-disk file and are harmless.
  const initResult = await Store.init()
  if (E.isLeft(initResult)) {
    Log.warn(LOG_TAG, "Failed to init unified store", initResult.left)
  }

  const result = await Store.get<PersistedUpdateState | null>(
    UPDATE_STATE_STORE_NAMESPACE,
    UPDATE_STATE_STORE_KEY
  )
  if (E.isRight(result) && result.right) {
    const parsed = UPDATE_STATE_SCHEMA.safeParse(result.right)
    if (parsed.success) {
      state.value = fromPersisted(parsed.data)
    }
  }
}

async function subscribeToEvents(): Promise<void> {
  if (unlistenFn) return
  unlistenFn = await listen<UpdateEvent>("updater-event", (event) => {
    state.value = nextState(state.value, event.payload)
  })
}

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPersistedState()
      await subscribeToEvents()
    })().catch((err) => {
      Log.error(LOG_TAG, "Initialization failed", err)
      initPromise = undefined
      throw err
    })
  }
  await initPromise
}

// Action wrappers. Each awaits initialization so the event listener is
// guaranteed subscribed before the Tauri command runs, then invokes the
// command. State transitions arrive via the event channel, so the
// wrappers do not mutate `state` on success. On `invoke` failure they
// feed a synthetic "failed" event through the same reducer so the
// transition path stays uniform.
async function check(): Promise<void> {
  await ensureInitialized()
  try {
    await invoke<UpdateInfo>("check_for_updates", { showNativeDialog: false })
  } catch (err) {
    state.value = nextState(state.value, {
      type: "CheckFailed",
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function download(): Promise<void> {
  await ensureInitialized()
  try {
    await invoke("download_and_install_update")
  } catch (err) {
    state.value = nextState(state.value, {
      type: "Error",
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

async function restart(): Promise<void> {
  await ensureInitialized()
  try {
    await invoke("restart_application")
  } catch (err) {
    state.value = nextState(state.value, {
      type: "Error",
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

async function cancel(): Promise<void> {
  await ensureInitialized()
  try {
    await invoke("cancel_update")
    // State advances to `idle` via the `updater-event` channel. The
    // Rust updater emits `UpdateCancelled` on success, so the
    // subscribed listener applies the transition. Applying it here
    // as well would produce two `idle` transitions per cancel, which
    // is harmless today but would double-fire any future side effect
    // added to the `UpdateCancelled` case in `nextState`.
  } catch (err) {
    state.value = nextState(state.value, {
      type: "Error",
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

export function useUpdateCheck(): {
  state: Readonly<Ref<UpdateState>>
  check: () => Promise<void>
  download: () => Promise<void>
  restart: () => Promise<void>
  cancel: () => Promise<void>
} {
  // Fire-and-forget initialization so the composable returns synchronously.
  // Actions await initialization internally before invoking commands, so
  // race-with-subscription is not possible through the action path. A
  // consumer that reads `state.value` immediately sees `idle`, which is
  // the correct default for a fresh mount.
  void ensureInitialized()

  return {
    state: readonly(state),
    check,
    download,
    restart,
    cancel,
  }
}
