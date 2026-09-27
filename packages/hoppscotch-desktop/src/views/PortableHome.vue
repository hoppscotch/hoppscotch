<template>
  <div
    class="flex flex-col items-center justify-center w-full h-screen bg-primary"
  >
    <div class="flex flex-col items-center space-y-6 max-w-md text-center">
      <AppHeader mode="Portable" />

      <div
        v-if="showPortableWelcome"
        class="flex flex-col items-center space-y-4 max-w-md text-center"
      >
        <div
          class="bg-primaryLight border border-dividerDark rounded-lg p-6 shadow-lg"
        >
          <h2 class="text-lg font-semibold text-secondaryDark mb-4">
            Portable Mode Information
          </h2>

          <div class="space-y-4 text-sm text-secondary text-left">
            <div>
              <p class="font-medium text-secondaryDark mb-2">Data Storage</p>
              <ul class="space-y-1 text-sm">
                <li>
                  • Your data is in the directory you launched this app from.
                </li>
                <li>• This won't sync with the installed version.</li>
              </ul>
            </div>

            <div class="bg-primary rounded p-3 border border-divider">
              <p class="font-medium text-secondaryDark text-sm mb-1">
                Why no automatic data transfer?
              </p>
              <p class="text-sm">
                Portable apps avoid accessing system directories to maintain
                compatibility with enterprise security policies.
              </p>
            </div>

            <div>
              <p class="font-medium text-secondaryDark mb-2">
                Updates & Migration
              </p>
              <ul class="space-y-1 text-sm">
                <li>• Updates require manual download</li>
                <li>• Data persists when updating portable versions</li>
                <li>
                  • Manually copy files to transfer from installed version
                </li>
              </ul>
            </div>
          </div>

          <div class="flex gap-4 items-center justify-center mt-6">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                v-model="portableSettings.disableUpdateNotifications"
                type="checkbox"
                class="form-checkbox h-4 w-4 text-accent"
                @change="onUpdateNotificationsChange"
              />
              <span class="text-sm">Don't notify about updates</span>
            </label>

            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                v-model="portableSettings.autoSkipWelcome"
                type="checkbox"
                class="form-checkbox h-4 w-4 text-accent"
                @change="onAutoSkipChange"
              />
              <span class="text-sm">Don't show this again</span>
            </label>
          </div>

          <div class="flex space-x-3 mt-6">
            <HoppButtonPrimary
              label="Continue"
              class="flex-1"
              @click="handlePortableWelcomeContinue"
            />
            <HoppButtonSecondary label="Close App" outline @click="closeApp" />
            <HoppButtonSecondary
              label="Learn More"
              outline
              @click="openDataMigrationDocs"
            />
          </div>
        </div>
      </div>

      <LoadingState
        v-else-if="appState === AppState.LOADING"
        :message="statusMessage"
      />

      <ErrorState
        v-else-if="appState === AppState.ERROR"
        :error="error"
        @retry="initialize"
      />

      <VersionInfo
        :version="appVersion"
        :data-directory="
          currentDirectory ? `${currentDirectory}/latest` : undefined
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from "vue"
import { close } from "@hoppscotch/plugin-appload"
import { invoke } from "@tauri-apps/api/core"

import { Io } from "~/kernel"
import {
  useAppInitialization,
  AppState,
} from "~/composables/useAppInitialization"
import { UpdaterClient, type UpdateEvent } from "~/services/updater.client"

import AppHeader from "./shared/AppHeader.vue"
import LoadingState from "./shared/LoadingState.vue"
import ErrorState from "./shared/ErrorState.vue"
import VersionInfo from "./shared/VersionInfo.vue"

const {
  appState,
  error,
  statusMessage,
  appVersion,
  persistence,
  loadRecent,
  initialize,
} = useAppInitialization()

const updaterClient = new UpdaterClient()

const showPortableWelcome = ref(false)
const currentDirectory = ref(".")

// Fields mirrored locally for the portable welcome screen's UI and the
// startup update gate. The welcome screen only lets the user toggle
// `disableUpdateNotifications` and `autoSkipWelcome`, but the update gate
// also reads `disableUpdateChecks` so a user who set that via the settings
// page on a prior session sees the gate respected on next startup. The full
// desktop settings object is loaded and merged in
// `handlePortableWelcomeContinue` so other fields like timeout or zoom,
// written elsewhere, survive intact.
const portableSettings = reactive({
  disableUpdateNotifications: false,
  autoSkipWelcome: false,
  disableUpdateChecks: false,
})

watch(
  portableSettings,
  (newValue) => {
    console.log("portableSettings changed:", newValue)
  },
  { deep: true }
)

const onUpdateNotificationsChange = () => {
  console.log(
    "Update notifications checkbox changed:",
    portableSettings.disableUpdateNotifications
  )
}

const onAutoSkipChange = () => {
  console.log("Auto skip checkbox changed:", portableSettings.autoSkipWelcome)
}

const openDataMigrationDocs = () => {
  Io.openExternalLink({
    url: "https://docs.hoppscotch.io/documentation/clients/desktop",
  })
}

const closeApp = async () => {
  try {
    await close({ windowLabel: "main" })
  } catch (err) {
    console.error("Failed to close app:", err)
  }
}

const handlePortableWelcomeContinue = async () => {
  try {
    // Read-modify-write against the full `DesktopSettings` object so
    // unrelated fields like timeout or zoom, potentially written by the
    // webview-side settings page in the same session, are preserved.
    const current = await persistence.desktopSettings.get()
    const updated = {
      ...current,
      disableUpdateNotifications: portableSettings.disableUpdateNotifications,
      autoSkipWelcome: portableSettings.autoSkipWelcome,
    }

    await persistence.desktopSettings.set(updated)

    showPortableWelcome.value = false
    await loadRecent()
  } catch (error) {
    console.error("Failed to save desktop settings:", error)
    showPortableWelcome.value = false
    await loadRecent()
  }
}

const checkForUpdatesPortable = async () => {
  console.log("Checking portable updates, current settings:", portableSettings)

  // Two disable flags land in this gate for backwards compatibility. The
  // legacy `disableUpdateNotifications` was originally documented as
  // controlling only notifications but was wired up to skip the whole check
  // in portable mode. The new `disableUpdateChecks` is the explicit
  // opt-out that matches the settings-page toggle. Either flag being true
  // skips the startup check, so users upgrading from a prior version keep
  // their original behavior and users who set the new flag see it honored.
  if (
    portableSettings.disableUpdateNotifications ||
    portableSettings.disableUpdateChecks
  ) {
    console.log("Automatic update check disabled for portable mode")
    return
  }

  statusMessage.value = "Checking for updates..."

  try {
    await updaterClient.checkForUpdates(true)
    console.log("Portable update check completed")
  } catch (err) {
    console.error("Error checking for portable updates:", err)
  }
}

const initializePortableMode = async () => {
  try {
    const latestDir = await invoke<string>("get_latest_dir")
    // NOTE: This is just to show where the files can be.
    // This can be flaky sometimes, but should be good enough regardless.
    const basePath = latestDir.replace(/[\\\/]latest$/, "")
    currentDirectory.value = basePath
  } catch (err) {
    console.error("Failed to get latest directory:", err)
    currentDirectory.value = "."
  }

  const settings = await persistence.desktopSettings.get()
  console.log("Loaded desktop settings:", settings)

  portableSettings.disableUpdateNotifications =
    settings.disableUpdateNotifications
  portableSettings.autoSkipWelcome = settings.autoSkipWelcome
  portableSettings.disableUpdateChecks = settings.disableUpdateChecks

  await checkForUpdatesPortable()

  if (!settings.autoSkipWelcome) {
    console.log("Showing portable welcome screen")
    showPortableWelcome.value = true
    return
  }

  console.log("Auto-skipping welcome screen")
  await loadRecent()
}

onMounted(async () => {
  // Listen to update events (mainly for error handling)
  // Checkout `updater.rs` for more info.
  await updaterClient.listenToUpdates((event: UpdateEvent) => {
    switch (event.type) {
      case "Error":
        console.error("Update error:", event.message)
        // For portable mode, errors are already handled by native dialogs,
        // see `updater.rs`.
        break
    }
  })

  await initialize(initializePortableMode)
})

onUnmounted(() => {
  updaterClient.stopListening()
})
</script>
