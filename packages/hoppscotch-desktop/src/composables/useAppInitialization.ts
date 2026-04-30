import { ref } from "vue"
import * as E from "fp-ts/Either"
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

// simple diag logger for the main window (runs before kernel log module is available)
function mainDiag(msg: string) {
  const line = `[${new Date().toISOString()}] [MAIN] ${msg}\n`
  if ((window as any).__TAURI_INTERNALS__) {
    ;(window as any).__TAURI_INTERNALS__
      .invoke("append_log", {
        filename: "io.hoppscotch.desktop.diag.log",
        content: line,
      })
      .catch(() => {})
  }
}

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
      await persistence.connectionState.set(state)
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

      mainDiag("loadVendoredInstance: calling load(bundleName=Hoppscotch)")
      console.log("Loading vendored app...")

      const loadResp = await load({
        bundleName: VENDORED_INSTANCE_CONFIG.bundleName!,
        window: { title: "Hoppscotch" },
      })

      mainDiag(
        `loadVendoredInstance: load result success=${loadResp.success}, label=${loadResp.windowLabel}`
      )
      if (!loadResp.success) {
        throw new Error("Failed to load Hoppscotch Vendored")
      }

      console.log("Vendored app loaded successfully")
      mainDiag("loadVendoredInstance: closing main window")
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
    mainDiag(
      `loadVendoredIfMatches: kind=${instance.kind}, displayName=${instance.displayName}, bundleName=${instance.bundleName}`
    )

    // cloud-org instances share the same bundleName as vendored ("Hoppscotch")
    // because they use the same app bundle, just loaded with a different org
    // context via the host parameter. we must check kind, not bundleName, to
    // distinguish them. without this, restarting the app after connecting to an
    // org would incorrectly load vendored (no host param = no org context).
    // "cloud" (default cloud, e.g. hoppscotch.io) also uses the vendored bundle
    // and doesn't need a download step.
    if (instance.kind === "vendored" || instance.kind === "cloud") {
      mainDiag(
        "loadVendoredIfMatches: matched vendored, calling loadVendoredInstance"
      )
      await loadVendoredInstance()
    } else if (instance.kind === "cloud-org") {
      // cloud-org: uses the vendored bundle but needs the host parameter so the
      // webview gets the org context (?org= query param). skip the download
      // step since cloud-org shares the vendored bundle which is already
      // available locally.
      try {
        statusMessage.value = `Loading ${instance.displayName}...`

        await saveConnectionState({
          status: "connecting",
          target: instance.serverUrl,
        })

        mainDiag(
          `loadVendoredIfMatches: loading cloud-org instance, bundle=${instance.bundleName}, host=${instance.serverUrl}`
        )
        const loadResp = await load({
          bundleName: instance.bundleName!,
          host: instance.serverUrl,
          window: { title: "Hoppscotch" },
        })

        mainDiag(
          `loadVendoredIfMatches: load result success=${loadResp.success}, label=${loadResp.windowLabel}`
        )
        if (!loadResp.success) {
          throw new Error(`Failed to load ${instance.displayName}`)
        }

        await saveConnectionState({
          status: "connected",
          instance: instance,
        })

        console.log(`Successfully loaded instance: ${instance.displayName}`)
        mainDiag("loadVendoredIfMatches: closing main window")
        close({ windowLabel: "main" })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(
          `Failed to load cloud-org instance ${instance.displayName}:`,
          errorMessage
        )

        await saveConnectionState({
          status: "error",
          target: instance.serverUrl,
          message: errorMessage,
        })

        mainDiag(
          `loadVendoredIfMatches: FAILED to load cloud-org ${instance.displayName}, falling back to vendored. error=${errorMessage}`
        )
        console.log("Falling back to vendored instance")
        await loadVendoredInstance()
      }
    } else {
      // self-hosted or other non-vendored instances: need to download the
      // bundle from the server before loading
      try {
        statusMessage.value = `Loading ${instance.displayName}...`

        await saveConnectionState({
          status: "connecting",
          target: instance.serverUrl,
        })

        await download({ serverUrl: instance.serverUrl })

        mainDiag(
          `loadVendoredIfMatches: loading non-vendored instance, bundle=${instance.bundleName}`
        )
        const loadResp = await load({
          bundleName: instance.bundleName!,
          window: { title: "Hoppscotch" },
        })

        mainDiag(
          `loadVendoredIfMatches: load result success=${loadResp.success}, label=${loadResp.windowLabel}`
        )
        if (!loadResp.success) {
          throw new Error(`Failed to load ${instance.displayName}`)
        }

        await saveConnectionState({
          status: "connected",
          instance: instance,
        })

        console.log(`Successfully loaded instance: ${instance.displayName}`)
        mainDiag("loadVendoredIfMatches: closing main window")
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

        mainDiag(
          `loadVendoredIfMatches: FAILED to load ${instance.displayName}, falling back to vendored. error=${errorMessage}`
        )
        console.log("Falling back to vendored instance")
        await loadVendoredInstance()
      }
    }
  }

  const loadRecent = async () => {
    try {
      statusMessage.value = "Loading application..."

      // Both the main window and the vendored webview's InstanceService
      // share hoppscotch-unified.store for connection state and recent
      // instances. The InstanceService's detectCurrentInstanceFromHostname
      // persists the detected instance (including cloud-org) to this store,
      // so on restart the main window can resume the correct instance.
      const connectionState = await persistence.connectionState.get()
      const recentInstances = await persistence.recentInstances.get()

      mainDiag(`loadRecent: connectionState=${JSON.stringify(connectionState)}`)
      mainDiag(
        `loadRecent: connectionState.status=${connectionState?.status ?? "(null)"}, instance.kind=${connectionState?.status === "connected" ? connectionState.instance?.kind : "(n/a)"}, instance.displayName=${connectionState?.status === "connected" ? connectionState.instance?.displayName : "(n/a)"}, recentInstances.length=${recentInstances.length}`
      )
      mainDiag(`loadRecent: recentInstances=${JSON.stringify(recentInstances)}`)
      console.log("Current connection state:", connectionState)
      console.log("Recent instances:", recentInstances)

      if (connectionState) {
        switch (connectionState.status) {
          case "connected":
            if (connectionState.instance) {
              mainDiag(
                `loadRecent: resuming connected instance: kind=${connectionState.instance.kind}, displayName=${connectionState.instance.displayName}`
              )
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
    // `init` returns `Either<StoreError, void>` so callers can decide
    // how to surface a failure. Branching to a thrown Error here lets
    // the surrounding `initialize()` try/catch route the failure into
    // `error.value` for the UI, the same way every other startup
    // failure is reported, instead of letting init silently complete
    // and leave the app running on defaults with no Rust sync.
    const initResult = await persistence.init()
    if (E.isLeft(initResult)) {
      throw new Error(
        `Persistence init failed: ${initResult.left.kind}: ${initResult.left.message}`
      )
    }
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
