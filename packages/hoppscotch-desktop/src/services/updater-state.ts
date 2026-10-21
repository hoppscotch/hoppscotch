import { AppState } from "~/composables/useAppInitialization"
import type { UpdateEvent, DownloadProgress } from "~/services/updater.client"

export type UpdateFlowState =
  | "available"
  | "downloading"
  | "installing"
  | "ready"

export interface UpdateTargetState {
  appState: { value: AppState }
  downloadProgress: { value: DownloadProgress }
  error: { value: string }
}

/**
 * Derives the visual flow state for the updater from current app state and download progress.
 */
export function getUpdateFlowState(
  appState: AppState,
  downloadPercentage: number
): UpdateFlowState {
  switch (appState) {
    case AppState.UPDATE_AVAILABLE:
      return "available"
    case AppState.UPDATE_IN_PROGRESS:
      return downloadPercentage < 100 ? "downloading" : "installing"
    case AppState.UPDATE_READY:
      return "ready"
    default:
      return "available"
  }
}

/**
 * Applies an incoming updater event to application state and download progress.
 */
export function applyUpdateEvent(
  event: UpdateEvent,
  target: UpdateTargetState
): void {
  switch (event.type) {
    case "DownloadProgress":
      target.downloadProgress.value = event.progress
      break

    case "DownloadCompleted":
    case "InstallStarted":
      target.appState.value = AppState.UPDATE_IN_PROGRESS
      target.downloadProgress.value = {
        ...target.downloadProgress.value,
        percentage: 100,
        downloaded:
          target.downloadProgress.value.total ??
          target.downloadProgress.value.downloaded,
      }
      break

    case "InstallCompleted":
      target.appState.value = AppState.UPDATE_IN_PROGRESS
      break

    case "RestartRequired":
      target.appState.value = AppState.UPDATE_READY
      break

    case "Error":
      target.error.value = event.message
      target.appState.value = AppState.ERROR
      break
  }
}

/**
 * Helper factory that creates an isolated update state container for testing or decoupled usage.
 */
export function createUpdateState(initialAppState = AppState.UPDATE_AVAILABLE) {
  const appState = { value: initialAppState }
  const downloadProgress = {
    value: {
      downloaded: 0,
      total: undefined as number | undefined,
      percentage: 0,
    },
  }
  const error = { value: "" }

  return {
    appState,
    downloadProgress,
    error,
    get flowState(): UpdateFlowState {
      return getUpdateFlowState(
        appState.value,
        downloadProgress.value.percentage
      )
    },
    get isRestartReady(): boolean {
      return this.flowState === "ready"
    },
    handleEvent(event: UpdateEvent) {
      applyUpdateEvent(event, { appState, downloadProgress, error })
    },
  }
}
