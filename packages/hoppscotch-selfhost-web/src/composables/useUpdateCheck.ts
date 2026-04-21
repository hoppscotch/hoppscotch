import { ref, readonly, type Ref } from "vue"
import * as E from "fp-ts/Either"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import { Store } from "@app/kernel/store"

/**
 * Webview-side accessor for the desktop updater.
 *
 * Wraps the existing Tauri updater commands (`check_for_updates`,
 * `download_and_install_update`, `restart_application`, `cancel_update`)
 * and the Rust-emitted `updater-event` channel into a single reactive
 * accessor that a settings-page button can bind to.
 *
 * State synchronization happens on two channels. On mount the composable
 * reads the persisted `UpdateState` from the store so a user who lands on
 * the settings page after a startup auto-check already ran sees the right
 * state. After mount it listens on the Tauri `updater-event` channel and
 * updates reactive state per event variant, so a download started from
 * any consumer (the startup flow, the portable welcome screen, this
 * button) is reflected in every mounted consumer.
 *
 * Module-level singleton: every caller gets the same reactive refs so the
 * settings button stays in sync with any other consumer that binds to
 * update state in the future.
 */

// Store coordinates for the persisted `UpdateState`. Must match the
// values written by
// `hoppscotch-desktop/src/services/persistence.service.ts`. The
// definitions here duplicate the ones in that file for the same reason
// the settings schema lives in common, which is that selfhost-web and
// hoppscotch-desktop do not depend on each other directly.
const UPDATE_STATE_STORE_NAMESPACE = "hoppscotch-desktop.v1"
const UPDATE_STATE_STORE_KEY = "updateState"

/**
 * Local copy of the update status enum used by the Tauri shell. String
 * values must match `UpdateStatus` in
 * `hoppscotch-desktop/src/types/index.ts`, since they cross the store
 * boundary as plain strings.
 */
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

export interface DownloadProgress {
  downloaded: number
  total?: number
  percentage: number
}

interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
}

// Persisted `UpdateState` definition. Matches the Zod schema in the
// Tauri shell's `persistence.service.ts`.
interface PersistedUpdateState {
  status: UpdateStatus
  version?: string
  message?: string
  progress?: { downloaded: number; total?: number }
}

// Tauri event payload variants. Must match the `UpdateEvent` tagged union in
// `hoppscotch-desktop/src/services/updater.client.ts`.
type UpdateEvent =
  | { type: "CheckStarted" }
  | { type: "CheckCompleted"; info: UpdateInfo }
  | { type: "CheckFailed"; error: string }
  | { type: "DownloadStarted"; totalBytes?: number }
  | { type: "DownloadProgress"; progress: DownloadProgress }
  | { type: "DownloadCompleted" }
  | { type: "InstallStarted" }
  | { type: "InstallCompleted" }
  | { type: "RestartRequired" }
  | { type: "UpdateCancelled" }
  | { type: "Error"; message: string }

// Singleton state. Initialized on first `useUpdateCheck()` call.
const status = ref<UpdateStatus>(UpdateStatus.IDLE)
const latestVersion = ref<string | undefined>(undefined)
const currentVersion = ref<string | undefined>(undefined)
const progress = ref<DownloadProgress | undefined>(undefined)
const errorMessage = ref<string | undefined>(undefined)
let initPromise: Promise<void> | undefined
let unlistenFn: UnlistenFn | undefined

async function loadPersistedState(): Promise<void> {
  const result = await Store.get<PersistedUpdateState>(
    UPDATE_STATE_STORE_NAMESPACE,
    UPDATE_STATE_STORE_KEY
  )
  if (E.isRight(result) && result.right) {
    const persisted = result.right
    status.value = persisted.status
    if (persisted.version) {
      latestVersion.value = persisted.version
    }
    if (persisted.progress && persisted.progress.total) {
      progress.value = {
        downloaded: persisted.progress.downloaded,
        total: persisted.progress.total,
        percentage:
          (persisted.progress.downloaded / persisted.progress.total) * 100,
      }
    }
  }
}

function applyEvent(event: UpdateEvent): void {
  switch (event.type) {
    case "CheckStarted":
      status.value = UpdateStatus.CHECKING
      errorMessage.value = undefined
      break
    case "CheckCompleted":
      status.value = event.info.available
        ? UpdateStatus.AVAILABLE
        : UpdateStatus.NOT_AVAILABLE
      currentVersion.value = event.info.currentVersion
      latestVersion.value = event.info.latestVersion
      break
    case "CheckFailed":
      status.value = UpdateStatus.ERROR
      errorMessage.value = event.error
      break
    case "DownloadStarted":
      status.value = UpdateStatus.DOWNLOADING
      progress.value = {
        downloaded: 0,
        total: event.totalBytes,
        percentage: 0,
      }
      break
    case "DownloadProgress":
      status.value = UpdateStatus.DOWNLOADING
      progress.value = event.progress
      break
    case "DownloadCompleted":
      status.value = UpdateStatus.INSTALLING
      break
    case "InstallStarted":
      status.value = UpdateStatus.INSTALLING
      break
    case "InstallCompleted":
      // Install is a short step that transitions straight into awaiting
      // a restart. The `RestartRequired` event follows and flips the
      // state, so no transition here.
      break
    case "RestartRequired":
      status.value = UpdateStatus.READY_TO_RESTART
      break
    case "UpdateCancelled":
      status.value = UpdateStatus.IDLE
      progress.value = undefined
      break
    case "Error":
      status.value = UpdateStatus.ERROR
      errorMessage.value = event.message
      break
  }
}

async function subscribeToEvents(): Promise<void> {
  if (unlistenFn) {
    return
  }
  unlistenFn = await listen<UpdateEvent>("updater-event", (event) => {
    applyEvent(event.payload)
  })
}

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPersistedState()
      await subscribeToEvents()
    })().catch((err) => {
      console.error("[useUpdateCheck] Initialization failed:", err)
      initPromise = undefined
      throw err
    })
  }
  await initPromise
}

async function check(): Promise<void> {
  try {
    status.value = UpdateStatus.CHECKING
    errorMessage.value = undefined
    const info = await invoke<UpdateInfo>("check_for_updates", {
      showNativeDialog: false,
    })
    // The Rust side also emits a `CheckCompleted` event which lands via the
    // listener. The direct invoke return value is used here as a fast path
    // in case the event listener registers after this call resolves.
    currentVersion.value = info.currentVersion
    latestVersion.value = info.latestVersion
    status.value = info.available
      ? UpdateStatus.AVAILABLE
      : UpdateStatus.NOT_AVAILABLE
  } catch (err) {
    status.value = UpdateStatus.ERROR
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

async function download(): Promise<void> {
  try {
    errorMessage.value = undefined
    status.value = UpdateStatus.DOWNLOADING
    await invoke("download_and_install_update")
  } catch (err) {
    status.value = UpdateStatus.ERROR
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

async function restart(): Promise<void> {
  try {
    await invoke("restart_application")
  } catch (err) {
    status.value = UpdateStatus.ERROR
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

async function cancel(): Promise<void> {
  try {
    await invoke("cancel_update")
    status.value = UpdateStatus.IDLE
    progress.value = undefined
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

export function useUpdateCheck(): {
  status: Readonly<Ref<UpdateStatus>>
  latestVersion: Readonly<Ref<string | undefined>>
  currentVersion: Readonly<Ref<string | undefined>>
  progress: Readonly<Ref<DownloadProgress | undefined>>
  errorMessage: Readonly<Ref<string | undefined>>
  check: () => Promise<void>
  download: () => Promise<void>
  restart: () => Promise<void>
  cancel: () => Promise<void>
} {
  // Fire-and-forget initialization so the composable returns synchronously.
  // The refs start at sensible defaults, so a consumer that binds before
  // `ensureInitialized` resolves just sees `IDLE` until the persisted read
  // lands, which is correct for a fresh mount.
  void ensureInitialized()

  return {
    status: readonly(status),
    latestVersion: readonly(latestVersion),
    currentVersion: readonly(currentVersion),
    progress: readonly(progress),
    errorMessage: readonly(errorMessage),
    check,
    download,
    restart,
    cancel,
  }
}
