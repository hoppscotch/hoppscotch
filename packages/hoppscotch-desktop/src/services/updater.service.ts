import { check, type DownloadEvent } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { UpdateStatus, CheckResult } from "~/types"
import { DesktopPersistenceService } from "~/services/persistence.service"

export class UpdaterService {
  private persistence: DesktopPersistenceService
  private currentProgress: { downloaded: number; total?: number } = {
    downloaded: 0,
  }

  constructor() {
    this.persistence = DesktopPersistenceService.getInstance()
  }

  async initialize(): Promise<void> {
    await this.persistence.setUpdateState({
      status: UpdateStatus.IDLE,
    })
  }

  getCurrentProgress(): { downloaded: number; total?: number } {
    return this.currentProgress
  }

  async checkForUpdates(timeout = 5000): Promise<CheckResult> {
    try {
      await this.persistence.setUpdateState({
        status: UpdateStatus.CHECKING,
      })

      // This creats a timeout promise that is slightly longer than `check`'s internal timeout,
      // this is just to make sure we don't keep checking for updates indefinitely.
      // NOTE: `check` tends to hang indefinitely in dev mode, but works in build,
      // so this is just in case this ever happens on prod.
      const timeoutPromise = new Promise<null>((resolve) => {
        // Longer local timeout to make sure it only triggers
        // if there's an issue with `check`'s built-in timeout.
        const bufferTimeout = timeout + 1000
        setTimeout(() => {
          console.log(
            "Update check exceeded buffer timeout, likely hanging in check function"
          )
          resolve(null)
        }, bufferTimeout)
      })

      const updateResult = await Promise.race([
        check({ timeout }),
        timeoutPromise,
      ])

      // If we got a timeout (null), we treat it as no update available
      // NOTE: We could maybe show more info but for now this works fine
      if (!updateResult) {
        console.log("Update check timed out or no update available")
        await this.persistence.setUpdateState({
          status: UpdateStatus.NOT_AVAILABLE,
        })
        return CheckResult.TIMEOUT
      }

      const hasUpdates = updateResult.available

      await this.persistence.setUpdateState(
        hasUpdates
          ? {
              status: UpdateStatus.AVAILABLE,
              version: updateResult.version,
              message: updateResult.body,
            }
          : {
              status: UpdateStatus.NOT_AVAILABLE,
            }
      )

      console.log("Update check result:", {
        available: updateResult.available,
        currentVersion: updateResult.currentVersion,
        version: updateResult.version,
      })

      return hasUpdates ? CheckResult.AVAILABLE : CheckResult.NOT_AVAILABLE
    } catch (error) {
      console.error("Error checking for updates:", error)
      await this.persistence.setUpdateState({
        status: UpdateStatus.ERROR,
        message: String(error),
      })
      return CheckResult.ERROR
    }
  }

  async downloadAndInstall(): Promise<void> {
    try {
      const updateResult = await check()

      if (!updateResult) {
        throw new Error("No update available to install")
      }

      await this.persistence.setUpdateState({
        status: UpdateStatus.DOWNLOADING,
      })

      let totalBytes: number | undefined
      let downloadedBytes = 0

      await updateResult.downloadAndInstall((event: DownloadEvent) => {
        try {
          if (event.event === "Started") {
            totalBytes = event.data.contentLength
            downloadedBytes = 0
            console.log(`Download started, total size: ${totalBytes} bytes`)
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength
            console.log(
              `Download progress: ${downloadedBytes}/${totalBytes} bytes`
            )

            this.currentProgress = {
              downloaded: downloadedBytes,
              total: totalBytes,
            }
          } else if (event.event === "Finished") {
            console.log("Download finished, starting installation")
            this.persistence.setUpdateState({
              status: UpdateStatus.INSTALLING,
            })
          }
        } catch (error) {
          console.warn("Progress tracking error:", error)
        }
      })

      // If we reach here, it means the app hasn't restarted automatically
      // Mark as ready to restart
      await this.persistence.setUpdateState({
        status: UpdateStatus.READY_TO_RESTART,
      })
    } catch (error) {
      console.error("Error installing updates:", error)
      await this.persistence.setUpdateState({
        status: UpdateStatus.ERROR,
        message: String(error),
      })
      throw error
    }
  }

  async restartApp(): Promise<void> {
    try {
      await relaunch()
    } catch (error) {
      console.error("Failed to restart app:", error)
      throw error
    }
  }
}
