import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
}

export interface DownloadProgress {
  downloaded: number
  total?: number
  percentage: number
}

// TODO: Type safety just like `persistence.serivce.ts`?
export type UpdateEvent =
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

export class UpdaterClient {
  private unlistenFn?: UnlistenFn

  async checkForUpdates(showNativeDialog = false): Promise<UpdateInfo> {
    return invoke("check_for_updates", { showNativeDialog })
  }

  async downloadAndInstall(): Promise<void> {
    return invoke("download_and_install_update")
  }

  async restart(): Promise<void> {
    return invoke("restart_application")
  }

  async cancel(): Promise<void> {
    return invoke("cancel_update")
  }

  async getDownloadProgress(): Promise<DownloadProgress> {
    return invoke("get_download_progress")
  }

  async isPortableMode(): Promise<boolean> {
    return invoke("is_portable_mode")
  }

  async listenToUpdates(
    callback: (event: UpdateEvent) => void
  ): Promise<UnlistenFn> {
    this.unlistenFn = await listen("updater-event", (event) => {
      callback(event.payload as UpdateEvent)
    })
    return this.unlistenFn
  }

  stopListening(): void {
    if (this.unlistenFn) {
      this.unlistenFn()
      this.unlistenFn = undefined
    }
  }
}
