import { describe, it, expect, beforeEach } from "vitest"
import { AppState } from "~/composables/useAppInitialization"
import {
  applyUpdateEvent,
  getUpdateFlowState,
  createUpdateState,
} from "~/services/updater-state"

describe("StandardHome updater state machine (production logic)", () => {
  let state: ReturnType<typeof createUpdateState>

  beforeEach(() => {
    state = createUpdateState(AppState.UPDATE_AVAILABLE)
  })

  it("1. Download completion followed by installation start", () => {
    state.appState.value = AppState.UPDATE_IN_PROGRESS
    state.downloadProgress.value = {
      downloaded: 950,
      total: 1000,
      percentage: 95,
    }
    expect(state.flowState).toBe("downloading")
    expect(state.isRestartReady).toBe(false)

    // DownloadCompleted arrives
    state.handleEvent({ type: "DownloadCompleted" })
    expect(state.appState.value).toBe(AppState.UPDATE_IN_PROGRESS)
    expect(state.downloadProgress.value.percentage).toBe(100)
    expect(state.downloadProgress.value.downloaded).toBe(1000)
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)

    // Followed by InstallStarted
    state.handleEvent({ type: "InstallStarted" })
    expect(state.appState.value).toBe(AppState.UPDATE_IN_PROGRESS)
    expect(state.downloadProgress.value.percentage).toBe(100)
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)
  })

  it("2. Installation completion leaves UI in installing state without prematurely exposing restart", () => {
    state.appState.value = AppState.UPDATE_IN_PROGRESS
    state.handleEvent({ type: "InstallStarted" })
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)

    // InstallCompleted arrives before RestartRequired
    state.handleEvent({ type: "InstallCompleted" })
    expect(state.appState.value).toBe(AppState.UPDATE_IN_PROGRESS)
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)
  })

  it("3. RestartRequired transitions to the ready-to-restart state", () => {
    state.appState.value = AppState.UPDATE_IN_PROGRESS
    state.handleEvent({ type: "InstallStarted" })
    state.handleEvent({ type: "InstallCompleted" })
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)

    // RestartRequired arrives after installation succeeds
    state.handleEvent({ type: "RestartRequired" })
    expect(state.appState.value).toBe(AppState.UPDATE_READY)
    expect(state.flowState).toBe("ready")
    expect(state.isRestartReady).toBe(true)
  })

  it("4. Installation errors transition to error state without transitioning to restart-ready", () => {
    state.appState.value = AppState.UPDATE_IN_PROGRESS
    state.handleEvent({ type: "InstallStarted" })

    // Error occurs during installation/verification
    state.handleEvent({
      type: "Error",
      message: "Package signature verification failed",
    })

    expect(state.appState.value).toBe(AppState.ERROR)
    expect(state.error.value).toBe("Package signature verification failed")
    expect(state.flowState).toBe("available")
    expect(state.isRestartReady).toBe(false)
  })

  it("5. Correct progress handling during installation", () => {
    state.appState.value = AppState.UPDATE_IN_PROGRESS

    // DownloadProgress updates progress during download
    state.handleEvent({
      type: "DownloadProgress",
      progress: { downloaded: 450, total: 1000, percentage: 45 },
    })
    expect(state.downloadProgress.value.percentage).toBe(45)
    expect(state.downloadProgress.value.downloaded).toBe(450)
    expect(state.downloadProgress.value.total).toBe(1000)
    expect(state.flowState).toBe("downloading")
    expect(state.isRestartReady).toBe(false)

    // Transition to installation snaps progress to 100% and sets downloaded = total
    state.handleEvent({ type: "InstallStarted" })
    expect(state.downloadProgress.value.percentage).toBe(100)
    expect(state.downloadProgress.value.downloaded).toBe(1000)
    expect(state.flowState).toBe("installing")
    expect(state.isRestartReady).toBe(false)
  })

  it("6. Direct applyUpdateEvent and getUpdateFlowState invocation on raw targets", () => {
    const rawTarget = {
      appState: { value: AppState.UPDATE_AVAILABLE },
      downloadProgress: {
        value: { downloaded: 0, total: undefined, percentage: 0 },
      },
      error: { value: "" },
    }

    // Direct invocation matches StandardHome.vue integration
    applyUpdateEvent({ type: "DownloadCompleted" }, rawTarget)
    expect(rawTarget.appState.value).toBe(AppState.UPDATE_IN_PROGRESS)
    expect(rawTarget.downloadProgress.value.percentage).toBe(100)
    expect(
      getUpdateFlowState(
        rawTarget.appState.value,
        rawTarget.downloadProgress.value.percentage
      )
    ).toBe("installing")
  })
})
