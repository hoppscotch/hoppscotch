<template>
  <div
    class="flex flex-col items-center justify-center w-full h-screen bg-primary"
  >
    <div class="flex flex-col items-center space-y-6 max-w-md text-center">
      <div class="flex items-center space-x-4">
        <img src="/logo.svg" alt="Hoppscotch" class="h-7 w-7" />
        <div class="flex flex-col items-start">
          <h1 class="text-2xl font-semibold text-secondaryDark">Hoppscotch</h1>
          <p class="text-secondary text-sm">Desktop</p>
        </div>
      </div>

      <div
        v-if="appState === AppState.LOADING"
        class="flex flex-col items-center space-y-4"
      >
        <HoppSmartSpinner />
        <p class="text-secondaryDark">{{ statusMessage }}</p>
      </div>

      <div
        v-else-if="
          appState === AppState.UPDATE_AVAILABLE ||
          appState === AppState.UPDATE_IN_PROGRESS ||
          appState === AppState.UPDATE_READY
        "
        class="flex flex-col items-center space-y-4"
      >
        <IconLucideDownload class="h-16 w-16 text-accent" />
        <div class="text-center">
          <h2 class="text-xl font-semibold text-secondaryDark">
            Update Available
          </h2>
          <p class="text-secondary mt-1">
            {{
              updateMessage ||
              "A new version of Hoppscotch is available, downloading..."
            }}
          </p>
        </div>

        <div
          v-if="downloadProgress.total && downloadProgress.downloaded"
          class="w-full"
        >
          <div class="w-full bg-primaryLight rounded-full h-2.5">
            <div
              class="bg-accent h-2.5 rounded-full"
              :style="{
                width: `${
                  (downloadProgress.downloaded / downloadProgress.total) * 100
                }%`,
              }"
            ></div>
          </div>
          <div class="flex justify-between text-sm text-secondaryLight mt-1">
            <span
              >{{
                Math.round(
                  (downloadProgress.downloaded / downloadProgress.total) * 100
                )
              }}%</span
            >
            <span class="text-xs">
              {{ formatBytes(downloadProgress.downloaded) }} /
              {{ formatBytes(downloadProgress.total) }}
            </span>
          </div>
        </div>

        <div v-else-if="downloadProgress.downloaded > 0" class="w-full">
          <div class="w-full bg-primaryLight rounded-full h-2.5">
            <div
              class="bg-accent h-2.5 rounded-full animate-pulse"
              style="width: 100%"
            ></div>
          </div>
          <p class="text-sm text-secondaryLight text-center mt-1">
            Downloaded {{ formatBytes(downloadProgress.downloaded) }}
          </p>
        </div>

        <div class="flex space-x-2">
          <HoppButtonPrimary
            v-if="appState === AppState.UPDATE_AVAILABLE"
            label="Install Update"
            :icon="IconLucideDownload"
            @click="installUpdate"
          />
          <HoppButtonPrimary
            v-else-if="appState === AppState.UPDATE_READY"
            label="Restart Now"
            :icon="IconLucideRefreshCw"
            @click="restartApp"
          />
          <HoppButtonSecondary
            v-if="appState === AppState.UPDATE_AVAILABLE"
            label="Later"
            outline
            @click="skipUpdate"
          />
        </div>
      </div>

      <div
        v-else-if="appState === AppState.ERROR"
        class="flex flex-col items-center space-y-4"
      >
        <IconLucideAlertCircle class="h-16 w-16 text-red-500" />
        <div class="text-center">
          <h2 class="text-xl font-semibold text-secondaryDark">
            Something went wrong
          </h2>
          <p class="text-red-500 mt-2">{{ error }}</p>
        </div>
        <HoppButtonPrimary
          label="Try Again"
          :icon="IconLucideRefreshCw"
          @click="initialize"
        />
      </div>

      <div class="text-secondaryLight text-xs mt-4">
        <p>Version {{ appVersion }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { LazyStore } from "@tauri-apps/plugin-store"
import { load, close } from "@hoppscotch/plugin-appload"
import { getVersion } from "@tauri-apps/api/app"

import { UpdateStatus, CheckResult, UpdateState } from "~/types"
import { UpdaterService } from "~/utils/updater"

import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"
import IconLucideDownload from "~icons/lucide/download"

const APP_STORE_PATH = "hoppscotch-desktop.store"

// `InstanceSwitcherService` store path.
// NOTE: This should be removed eventually,
// right now this is part 1/5 of HFE-864
const INSTANCE_STORE_PATH = "hopp.store.json"

enum AppState {
  LOADING = "loading",
  UPDATE_AVAILABLE = "update_available",
  UPDATE_IN_PROGRESS = "update_in_progress",
  UPDATE_READY = "update_ready",
  ERROR = "error",
  LOADED = "loaded",
}

interface VendoredInstance {
  type: "vendored"
  displayName: string
  version: string
}

interface ConnectionState {
  status: "idle" | "connecting" | "connected" | "error"
  instance?: VendoredInstance
  target?: string
  message?: string
}

const appStore = new LazyStore(APP_STORE_PATH)
const appState = ref<AppState>(AppState.LOADING)
const updateStatus = ref("")
const updateMessage = ref("")
const downloadProgress = ref<{ downloaded: number; total?: number }>({
  downloaded: 0,
})
const error = ref("")
const statusMessage = ref("Initializing...")
const appVersion = ref("...")

const updaterService = new UpdaterService(appStore)

let progressPollingInterval: ReturnType<typeof setInterval> | undefined

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const saveConnectionState = async (state: ConnectionState) => {
  try {
    await appStore.set("connectionState", state)
    await appStore.save()
  } catch (err) {
    console.error("Failed to save connection state:", err)
  }
}

const setupUpdateStateWatcher = async () => {
  const unsubscribe = await appStore.onKeyChange<UpdateState>(
    "updateState",
    (newValue) => {
      if (!newValue) return

      updateStatus.value = newValue.status
      updateMessage.value = newValue.message || ""

      if (newValue.status === UpdateStatus.AVAILABLE) {
        appState.value = AppState.UPDATE_AVAILABLE
      } else if (newValue.status === UpdateStatus.ERROR) {
        error.value = newValue.message || "Unknown error"
        appState.value = AppState.ERROR
        // Stop progress polling on error
        stopProgressPolling()
      } else if (
        newValue.status === UpdateStatus.DOWNLOADING ||
        newValue.status === UpdateStatus.INSTALLING
      ) {
        appState.value = AppState.UPDATE_IN_PROGRESS
        // Start progress polling when downloading
        if (newValue.status === UpdateStatus.DOWNLOADING) {
          startProgressPolling()
        } else {
          // Stop progress polling when installing
          stopProgressPolling()
        }
      } else if (newValue.status === UpdateStatus.READY_TO_RESTART) {
        appState.value = AppState.UPDATE_READY
        // Stop progress polling when ready to restart
        stopProgressPolling()
      }
    }
  )

  return unsubscribe
}

const startProgressPolling = () => {
  if (progressPollingInterval) return

  progressPollingInterval = setInterval(() => {
    const currentProgress = updaterService.getCurrentProgress()
    if (currentProgress.downloaded > downloadProgress.value.downloaded) {
      downloadProgress.value = currentProgress
    }
  }, 100)
}

const stopProgressPolling = () => {
  if (progressPollingInterval) {
    clearInterval(progressPollingInterval)
    progressPollingInterval = undefined
  }
}

const installUpdate = async () => {
  try {
    appState.value = AppState.UPDATE_IN_PROGRESS
    await updaterService.downloadAndInstall()
    // In a rare occurrence where we reach here but automatic restart didn't happen,
    // we'll just show a restart button instead
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = `Failed to install update: ${errorMessage}`
    appState.value = AppState.ERROR
    stopProgressPolling()
  }
}

const skipUpdate = async () => {
  await loadVendored()
}

const restartApp = async () => {
  try {
    await updaterService.restartApp()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = `Failed to restart app: ${errorMessage}`
    appState.value = AppState.ERROR
  }
}

const loadVendored = async () => {
  try {
    statusMessage.value = "Loading application..."

    // Standardized vendored instance data.
    // NOTE: This should be removed eventually,
    // right now this is part 1/5 of HFE-864
    const vendoredInstance: VendoredInstance = {
      type: "vendored",
      displayName: "Hoppscotch",
      version: "25.8.1",
    }

    const connectionState: ConnectionState = {
      status: "connected",
      instance: vendoredInstance,
    }

    // Save to current app store.
    // NOTE: This is existing behavior
    await saveConnectionState(connectionState)

    // ALSO save to `InstanceSwitcherService` store,
    // NOTE: This should be removed eventually,
    // right now this is part 1/5 of HFE-864
    try {
      const instanceStore = new LazyStore(INSTANCE_STORE_PATH)
      await instanceStore.init()
      await instanceStore.set("connectionState", connectionState)
      await instanceStore.save()
      console.log(
        "Successfully saved vendored state to `InstanceSwitcherService` store"
      )
    } catch (instanceStoreError) {
      console.error(
        "Failed to save to `InstanceSwitcherService` store:",
        instanceStoreError
      )
      // Don't need to fail the flow if this fails.
    }

    console.log("Loading vendored app...")
    const loadResp = await load({
      bundleName: "Hoppscotch",
      window: { title: "Hoppscotch" },
    })

    if (!loadResp.success) {
      throw new Error("Failed to load Hoppscotch Vendored")
    }

    console.log("Vendored app loaded successfully")

    console.log("Closing main window")

    // NOTE: No need to await the promise here.
    close({ windowLabel: "main" })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error("Error loading vendored app:", errorMessage)
    error.value = errorMessage

    await saveConnectionState({
      status: "error",
      target: "Vendored",
      message: errorMessage,
    })

    appState.value = AppState.ERROR
  }
}

const initialize = async () => {
  appState.value = AppState.LOADING
  error.value = ""
  downloadProgress.value = { downloaded: 0 }
  stopProgressPolling()

  try {
    try {
      appVersion.value = await getVersion()
    } catch (error) {
      console.error("Failed to get app version:", error)
      appVersion.value = "unknown"
    }

    statusMessage.value = "Initializing stores..."
    await appStore.init()
    await updaterService.initialize()

    await setupUpdateStateWatcher()

    statusMessage.value = "Checking for updates..."
    const checkResult = await updaterService.checkForUpdates()

    if (checkResult === CheckResult.AVAILABLE) {
      console.log("Updates available, prompting for install")
      appState.value = AppState.UPDATE_AVAILABLE
      return
    }

    await loadVendored()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error("Initialization error:", errorMessage)
    error.value = errorMessage
    appState.value = AppState.ERROR
  }
}

onMounted(() => {
  initialize()
})

onUnmounted(() => {
  stopProgressPolling()
})
</script>
