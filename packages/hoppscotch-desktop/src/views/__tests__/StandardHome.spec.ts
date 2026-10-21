import { describe, it, expect, beforeEach } from "vitest"
import { AppState } from "~/composables/useAppInitialization"
import type { UpdateEvent, DownloadProgress } from "~/services/updater.client"

/**
 * State machine and update event handling logic matching StandardHome.vue
 */
function createUpdateStateMachine() {
  let appState = AppState.UPDATE_AVAILABLE
  let error = ""
  let downloadProgress: DownloadProgress = {
    downloaded: 0,
    total: undefined,
    percentage: 0,
  }

  const getUpdateFlowState = ():
    | "available"
    | "downloading"
    | "installing"
    | "ready" => {
    switch (appState) {
      case AppState.UPDATE_AVAILABLE:
        return "available"
      case AppState.UPDATE_IN_PROGRESS:
        return downloadProgress.percentage < 100
          ? "downloading"
          : "installing"
      case AppState.UPDATE_READY:
        return "ready"
      default:
        return "available"
    }
  }

  const handleUpdateEvent = (event: UpdateEvent) => {
    switch (event.type) {
      case "DownloadProgress":
        downloadProgress = event.progress
        break
      case "DownloadCompleted":
      case "InstallStarted":
        appState = AppState.UPDATE_IN_PROGRESS
        downloadProgress.percentage = 100
        if (downloadProgress.total) {
          downloadProgress.downloaded = downloadProgress.total
        }
        break
      case "InstallCompleted":
        appState = AppState.UPDATE_IN_PROGRESS
        break
      case "RestartRequired":
        appState = AppState.UPDATE_READY
        break
      case "Error":
        error = event.message
        appState = AppState.ERROR
        break
    }
  }

  return {
    getState: () => ({
      appState,
      error,
      downloadProgress: { ...downloadProgress },
      updateFlowState: getUpdateFlowState(),
      isRestartActionVisible: getUpdateFlowState() === "ready",
    }),
    handleUpdateEvent,
    setAppState: (state: AppState) => {
      appState = state
    },
  }
}

describe("StandardHome update flow state transitions", () => {
  let machine: ReturnType<typeof createUpdateStateMachine>

  beforeEach(() => {
    machine = createUpdateStateMachine()
  })

  it("1. DownloadProgress updates progress without showing the restart action", () => {
    machine.setAppState(AppState.UPDATE_IN_PROGRESS)

    machine.handleUpdateEvent({
      type: "DownloadProgress",
      progress: { downloaded: 500, total: 1000, percentage: 50 },
    })

    const state = machine.getState()
    expect(state.downloadProgress.percentage).toBe(50)
    expect(state.downloadProgress.downloaded).toBe(500)
    expect(state.updateFlowState).toBe("downloading")
    expect(state.isRestartActionVisible).toBe(false)
  })

  it("2. DownloadCompleted and InstallStarted leave the UI in an installing state", () => {
    machine.setAppState(AppState.UPDATE_IN_PROGRESS)

    machine.handleUpdateEvent({
      type: "DownloadProgress",
      progress: { downloaded: 1000, total: 1000, percentage: 99 },
    })
    expect(machine.getState().updateFlowState).toBe("downloading")

    machine.handleUpdateEvent({ type: "DownloadCompleted" })
    expect(machine.getState().updateFlowState).toBe("installing")
    expect(machine.getState().isRestartActionVisible).toBe(false)
    expect(machine.getState().downloadProgress.percentage).toBe(100)

    machine.handleUpdateEvent({ type: "InstallStarted" })
    expect(machine.getState().updateFlowState).toBe("installing")
    expect(machine.getState().isRestartActionVisible).toBe(false)
  })

  it("3. RestartRequired transitions to the ready state and enables restart action", () => {
    machine.setAppState(AppState.UPDATE_IN_PROGRESS)
    machine.handleUpdateEvent({ type: "InstallStarted" })

    machine.handleUpdateEvent({ type: "RestartRequired" })

    const state = machine.getState()
    expect(state.appState).toBe(AppState.UPDATE_READY)
    expect(state.updateFlowState).toBe("ready")
    expect(state.isRestartActionVisible).toBe(true)
  })

  it("4. Error transitions to the error state and prevents the restart action", () => {
    machine.setAppState(AppState.UPDATE_IN_PROGRESS)

    machine.handleUpdateEvent({
      type: "Error",
      message: "Signature verification failed",
    })

    const state = machine.getState()
    expect(state.appState).toBe(AppState.ERROR)
    expect(state.error).toBe("Signature verification failed")
    expect(state.isRestartActionVisible).toBe(false)
  })

  it("5. InstallCompleted alone does not incorrectly bypass the required restart transition", () => {
    machine.setAppState(AppState.UPDATE_IN_PROGRESS)
    machine.handleUpdateEvent({ type: "InstallStarted" })

    machine.handleUpdateEvent({ type: "InstallCompleted" })

    const state = machine.getState()
    expect(state.appState).toBe(AppState.UPDATE_IN_PROGRESS)
    expect(state.updateFlowState).toBe("installing")
    expect(state.isRestartActionVisible).toBe(false)
  })
})
