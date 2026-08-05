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
import { useDesktopSettings } from "@hoppscotch/common/composables/desktop-settings"

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

  // Shared with the launcher's own zoom watcher (`useDesktopZoomEffect`).
  // Each `load()` call below awaits `desktopSettings.ready()` before
  // reading `zoomLevel`, so the appload Rust-side pre-mount apply gets
  // the persisted value rather than the schema default on a fast
  // cold-start click. Without the gate, a user who clicks Connect
  // before the store read resolves would forward 1.0 to appload and
  // see the bundled app paint at 100% even though their setting was
  // 110, 125, or 150.
  const desktopSettings = useDesktopSettings()

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

      // Wait for the store read before forwarding `zoomLevel`, so the
      // appload Rust-side pre-mount apply gets the persisted value
      // rather than the schema default on a fast cold-start click.
      await desktopSettings.ready()

      const loadResp = await load({
        bundleName: VENDORED_INSTANCE_CONFIG.bundleName!,
        window: {
          title: "Hoppscotch",
          zoomLevel: desktopSettings.settings.zoomLevel,
        },
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
        await desktopSettings.ready()
        const loadResp = await load({
          bundleName: instance.bundleName!,
          host: instance.serverUrl,
          window: {
            title: "Hoppscotch",
            zoomLevel: desktopSettings.settings.zoomLevel,
          },
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

        const dlResp = await download({ serverUrl: instance.serverUrl })
        const updatedInstance: Instance = {
          ...instance,
          version: dlResp.version,
          bundleName: dlResp.bundleName,
        }
        const DESKTOP_APP_SERVER_PATH = "/desktop-app-server"
        const normUrl = (u: string) => {
          let n = u.toLowerCase()
          while (n.endsWith("/")) n = n.slice(0, -1)
          if (n.endsWith(DESKTOP_APP_SERVER_PATH))
            n = n.slice(0, -DESKTOP_APP_SERVER_PATH.length)
          while (n.endsWith("/")) n = n.slice(0, -1)
          return n
        }
        try {
          const recentInstances = await persistence.recentInstances.get()
          await persistence.recentInstances.set(
            recentInstances.map((r) =>
              normUrl(r.serverUrl) === normUrl(updatedInstance.serverUrl)
                ? {
                    ...r,
                    version: dlResp.version,
                    bundleName: dlResp.bundleName,
                  }
                : r
            )
          )
        } catch (syncErr) {
          console.error("Failed to sync recent instance version:", syncErr)
        }

        mainDiag(
          `loadVendoredIfMatches: loading non-vendored instance, bundle=${updatedInstance.bundleName}`
        )
        await desktopSettings.ready()
        const loadResp = await load({
          bundleName: updatedInstance.bundleName!,
          window: {
            title: "Hoppscotch",
            zoomLevel: desktopSettings.settings.zoomLevel,
          },
        })

        mainDiag(
          `loadVendoredIfMatches: load result success=${loadResp.success}, label=${loadResp.windowLabel}`
        )
        if (!loadResp.success) {
          throw new Error(`Failed to load ${instance.displayName}`)
        }

        await saveConnectionState({
          status: "connected",
          instance: updatedInstance,
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

  // Only cloud-org and self-hosted (`on-prem`) instances require auth.
  // `vendored` runs fully offline and `cloud` (default cloud) stays usable
  // while signed out, so neither can leave the user on a login-required
  // screen and neither needs an auth probe before resuming.
  const isAuthRequiringInstance = (instance: Instance): boolean =>
    instance.kind === "cloud-org" || instance.kind === "on-prem"

  // The auth session for an instance is stored in that instance's webview
  // (its `localStorage` bearer tokens), a context the launcher window cannot
  // read, so the launcher cannot verify the session over the network on its
  // own. Instead the webview records the instance's `serverUrl` under
  // `instanceAuthFailure` when its auth flow routes to the login-required
  // screen. Reading and consuming that record here is the launcher's auth
  // probe, a match means the last resume of this instance ended unable to
  // authenticate, so resuming again would route straight back to the same
  // screen with the main window already closed. Returning false lets startup
  // continue to the vendored app instead, whose header renders the
  // instance switcher.
  const probeInstanceAuth = async (instance: Instance): Promise<boolean> => {
    if (!isAuthRequiringInstance(instance)) return true

    try {
      const failedUrl = await persistence.instanceAuthFailure.get()
      if (failedUrl && failedUrl === instance.serverUrl) {
        // Consume the one-shot record so a later manual reconnect through the
        // switcher is not blocked once the user re-authenticates.
        await persistence.instanceAuthFailure.set(null)
        return false
      }
      return true
    } catch (err) {
      // A degraded store must not block a resume that would otherwise
      // succeed, so treat an unreadable record as "no known failure".
      console.warn("Failed to read instance auth-failure record:", err)
      return true
    }
  }

  // Resume `instance` unless its auth-failure record blocks it. A blocked
  // resume demotes the persisted state to `idle` and loads the vendored app,
  // so the user reaches the instance switcher rather than the login-required
  // screen the failed instance would route to. Returns true once startup is
  // handled here (resume started, or the vendored redirect ran), and false
  // when the resume threw so the caller can try the next candidate.
  const tryResumeInstance = async (instance: Instance): Promise<boolean> => {
    if (!(await probeInstanceAuth(instance))) {
      mainDiag(
        `loadRecent: auth probe failed for ${instance.displayName}, demoting to idle and loading vendored`
      )
      await saveConnectionState({ status: "idle" })
      await loadVendoredInstance()
      return true
    }
    try {
      await loadVendoredIfMatches(instance)
      return true
    } catch (err) {
      console.warn("Failed to resume instance:", err)
      return false
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
              // A `connected` status persists across restarts, so without the
              // auth probe in `tryResumeInstance` an auth-gated instance whose
              // last resume could not authenticate would be resumed again on
              // every launch, routing back to the login-required screen.
              statusMessage.value = `Connecting to ${connectionState.instance.displayName}...`
              if (await tryResumeInstance(connectionState.instance)) return
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
                if (await tryResumeInstance(targetInstance)) return
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
        if (await tryResumeInstance(mostRecentInstance)) return
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
