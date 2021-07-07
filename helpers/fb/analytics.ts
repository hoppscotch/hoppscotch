import firebase from "firebase"
import { authEvents$ } from "./auth"
import { HoppAccentColor, HoppBgColor, settings$ } from "~/newstore/settings"

let analytics: firebase.analytics.Analytics

type SettingsCustomDimensions = {
  usesProxy: boolean
  usesExtension: boolean
  usesScrollInto: boolean
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
  analytics = firebase.app().analytics()

  initLoginListeners()
  initSettingsListeners()
}

function initLoginListeners() {
  authEvents$.subscribe((ev) => {
    if (ev.event === "login") {
      analytics.setUserId(ev.user.uid)

      analytics.logEvent("login", {
        method: ev.user.providerData[0]?.providerId, // Assume the first provider is the login provider
      })
    } else if (ev.event === "logout") {
      analytics.logEvent("logout")
    }
  })
}

function initSettingsListeners() {
  settings$.subscribe((settings) => {
    const conf: SettingsCustomDimensions = {
      usesProxy: settings.PROXY_ENABLED,
      usesExtension: settings.EXTENSIONS_ENABLED,
      usesScrollInto: settings.SCROLL_INTO_ENABLED,
      syncCollections: settings.syncCollections,
      syncEnvironments: settings.syncEnvironments,
      syncHistory: settings.syncHistory,
      usesAccent: settings.THEME_COLOR,
      usesBg: settings.BG_COLOR,
      usesTelemetry: settings.TELEMETRY_ENABLED,
    }

    analytics.setUserProperties(conf)
  })
}

export function logHoppRequestRunToAnalytics(ev: HoppRequestEvent) {
  analytics.logEvent("hopp-request", ev)
}
