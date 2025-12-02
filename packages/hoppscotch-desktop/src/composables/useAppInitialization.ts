import { ref } from "vue"
import { load, download, close } from "@hoppscotch/plugin-appload"
import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"

import { DesktopPersistenceService } from "~/services/persistence.service"
import { InstanceStoreMigrationService } from "~/services/instance-store-migration.service"
import type {
  Instance,
  ConnectionState,
} from "@hoppscotch/common/platform/instance"
import { VENDORED_INSTANCE_CONFIG } from "@hoppscotch/common/platform/instance"

export enum AppState {
  LOADING = "loading",
  UPDATE_AVAILABLE = "update_available",
  UPDATE_IN_PROGRESS = "update_in_progress",
  UPDATE_READY = "update_ready",
  ERROR = "error",
  LOADED = "loaded",
}

export function useAppInitialization() {
  const persistence = DesktopPersistenceService.getInstance()
  const migration = InstanceStoreMigrationService.getInstance()

  const appState = ref<AppState>(AppState.LOADING)
  const error = ref("")
  const statusMessage = ref("Initializing...")
  const appVersion = ref("...")

  const saveConnectionState = async (state: ConnectionState) => {
    try {
      await persistence.setConnectionState(state)
    } catch (err) {
      console.error("Failed to save connection state:", err)
    }
  }

  const findMostRecentInstance = (
    instances: Instance[],
    targetUrl: string
  ): Instance | null => {
    return (
      instances.find(
        (instance) =>
          instance.serverUrl === targetUrl ||
          instance.serverUrl.includes(targetUrl) ||
          targetUrl.includes(instance.serverUrl)
      ) || null
    )
  }

  const loadVendoredInstance = async () => {
    try {
      statusMessage.value = "Loading Hoppscotch Desktop..."

      await saveConnectionState({
        status: "connected",
        instance: VENDORED_INSTANCE_CONFIG,
      })

      console.log("Loading vendored app...")
      const loadResp = await load({
        bundleName: VENDORED_INSTANCE_CONFIG.bundleName!,
        window: { title: "Hoppscotch" },
      })

      if (!loadResp.success) {
        throw new Error("Failed to load Hoppscotch Vendored")
      }

      console.log("Vendored app loaded successfully")
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

  const loadVendoredIfMatches = async (instance: Instance) => {
    if (
      instance.kind === "vendored" ||
      instance.bundleName === VENDORED_INSTANCE_CONFIG.bundleName
    ) {
      await loadVendoredInstance()
    } else {
      try {
        statusMessage.value = `Loading ${instance.displayName}...`

        await saveConnectionState({
          status: "connecting",
          target: instance.serverUrl,
        })

        await download({ serverUrl: instance.serverUrl })

        const loadResp = await load({
          bundleName: instance.bundleName!,
          window: { title: "Hoppscotch" },
        })

        if (!loadResp.success) {
          throw new Error(`Failed to load ${instance.displayName}`)
        }

        await saveConnectionState({
          status: "connected",
          instance: instance,
        })

        console.log(`Successfully loaded instance: ${instance.displayName}`)
        close({ windowLabel: "main" })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(
          `Failed to load instance ${instance.displayName}:`,
          errorMessage
        )

        await saveConnectionState({
          status: "error",
          target: instance.serverUrl,
          message: errorMessage,
        })

        console.log("Falling back to vendored instance")
        await loadVendoredInstance()
      }
    }
  }

  const loadRecent = async () => {
    try {
      statusMessage.value = "Loading application..."

      const connectionState = await persistence.getConnectionState()
      const recentInstances = await persistence.getRecentInstances()

      console.log("Current connection state:", connectionState)
      console.log("Recent instances:", recentInstances)

      if (connectionState) {
        switch (connectionState.status) {
          case "connected":
            if (connectionState.instance) {
              statusMessage.value = `Connecting to ${connectionState.instance.displayName}...`
              try {
                await loadVendoredIfMatches(connectionState.instance)
                return
              } catch (err) {
                console.warn(
                  "Failed to load previously connected instance:",
                  err
                )
              }
            }
            break

          case "connecting":
            if (connectionState.target) {
              statusMessage.value = `Resuming connection to ${connectionState.target}...`
              const targetInstance = findMostRecentInstance(
                recentInstances,
                connectionState.target
              )
              if (targetInstance) {
                try {
                  await loadVendoredIfMatches(targetInstance)
                  return
                } catch (err) {
                  console.warn("Failed to resume connection:", err)
                }
              }
            }
            break

          case "error":
            console.warn("Previous connection failed:", connectionState.message)
            break

          case "idle":
          default:
            break
        }
      }

      const mostRecentInstance = recentInstances[0]

      if (mostRecentInstance) {
        statusMessage.value = `Connecting to ${mostRecentInstance.displayName}...`
        try {
          await loadVendoredIfMatches(mostRecentInstance)
          return
        } catch (err) {
          console.warn("Failed to load most recent instance:", err)
        }
      }

      console.log("No recent instances found, loading vendored as fallback")
      await loadVendoredInstance()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Error in loadRecent:", errorMessage)
      error.value = errorMessage
      appState.value = AppState.ERROR
    }
  }

  const performBasicInitialization = async () => {
    try {
      appVersion.value = await getVersion()
    } catch (error) {
      console.error("Failed to get app version:", error)
      appVersion.value = "unknown"
    }

    statusMessage.value = "Checking for version changes..."
    try {
      await invoke("check_and_backup_on_version_change")
      console.log("Version backup check completed")
    } catch (err) {
      console.warn("Version backup check failed:", err)
    }

    statusMessage.value = "Running data migration..."
    await migration.initialize()

    const migrationStatus = migration.getMigrationStatus()
    if (migrationStatus.value.status === "failed") {
      throw new Error(
        `Migration failed: ${migration.getMigrationError().value}`
      )
    }

    statusMessage.value = "Initializing stores..."
    await persistence.init()
  }

  const initialize = async (customLogic?: () => Promise<void>) => {
    appState.value = AppState.LOADING
    error.value = ""

    try {
      await performBasicInitialization()

      if (customLogic) {
        await customLogic()
      } else {
        await loadRecent()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Initialization error:", errorMessage)
      error.value = errorMessage
      appState.value = AppState.ERROR
    }
  }

  return {
    appState,
    error,
    statusMessage,
    appVersion,

    persistence,
    migration,

    saveConnectionState,
    findMostRecentInstance,
    loadVendoredInstance,
    loadVendoredIfMatches,
    loadRecent,
    performBasicInitialization,
    initialize,
  }
}
