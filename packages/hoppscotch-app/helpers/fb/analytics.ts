import {
  Analytics,
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperties,
} from "firebase/analytics"
import { authEvents$ } from "./auth"
import {
  HoppAccentColor,
  HoppBgColor,
  settings$,
  settingsStore,
} from "~/newstore/settings"

let analytics: Analytics | null = null

type SettingsCustomDimensions = {
  usesProxy: boolean
  usesExtension: boolean
  syncCollections: boolean
  syncEnvironments: boolean
  syncHistory: boolean
  usesBg: HoppBgColor
  usesAccent: HoppAccentColor
  usesTelemetry: boolean
}

type HoppRequestEvent =
  | {
      platform: "rest" | "graphql-query" | "graphql-schema"
      strategy: "normal" | "proxy" | "extension"
    }
  | { platform: "wss" | "sse" | "socketio" | "mqtt" }

export function initAnalytics() {
  analytics = getAnalytics()

  initLoginListeners()
  initSettingsListeners()
}

function initLoginListeners() {
  authEvents$.subscribe((ev) => {
    if (ev.event === "login") {
      if (settingsStore.value.TELEMETRY_ENABLED && analytics) {
        setUserId(analytics, ev.user.uid)

        logEvent(analytics, "login", {
          method: ev.user.providerData[0]?.providerId, // Assume the first provider is the login provider
        })
      }
    } else if (ev.event === "logout") {
      if (settingsStore.value.TELEMETRY_ENABLED && analytics) {
        logEvent(analytics, "logout")
      }
    }
  })
}

function initSettingsListeners() {
  // Keep track of the telemetry status
  let telemetryStatus = settingsStore.value.TELEMETRY_ENABLED

  settings$.subscribe((settings) => {
    const conf: SettingsCustomDimensions = {
      usesProxy: settings.PROXY_ENABLED,
      usesExtension: settings.EXTENSIONS_ENABLED,
      syncCollections: settings.syncCollections,
      syncEnvironments: settings.syncEnvironments,
      syncHistory: settings.syncHistory,
      usesAccent: settings.THEME_COLOR,
      usesBg: settings.BG_COLOR,
      usesTelemetry: settings.TELEMETRY_ENABLED,
    }

    // User toggled telemetry mode to off or to on
    if (
      ((telemetryStatus && !settings.TELEMETRY_ENABLED) ||
        settings.TELEMETRY_ENABLED) &&
      analytics
    ) {
      setUserProperties(analytics, conf)
    }

    telemetryStatus = settings.TELEMETRY_ENABLED

    if (analytics) setAnalyticsCollectionEnabled(analytics, telemetryStatus)
  })

  if (analytics) setAnalyticsCollectionEnabled(analytics, telemetryStatus)
}

export function logHoppRequestRunToAnalytics(ev: HoppRequestEvent) {
  if (settingsStore.value.TELEMETRY_ENABLED && analytics) {
    logEvent(analytics, "hopp-request", ev)
  }
}

export function logPageView(pagePath: string) {
  if (settingsStore.value.TELEMETRY_ENABLED && analytics) {
    logEvent(analytics, "page_view", {
      page_path: pagePath,
    })
  }
}
