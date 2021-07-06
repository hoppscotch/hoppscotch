import firebase from "firebase"
import { authEvents$ } from "./auth"
import { settings$ } from "~/newstore/settings"

let analytics: firebase.analytics.Analytics

type SettingsCustomDimensions = {
  usesProxy: boolean
  usesExtension: boolean
  usesScrollInto: boolean
  syncCollections: boolean
  syncEnvironments: boolean
  syncHistory: boolean
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
    analytics.setUserProperties(<SettingsCustomDimensions>{
      usesProxy: settings.PROXY_ENABLED,
      usesExtension: settings.EXTENSIONS_ENABLED,
      usesScrollInto: settings.SCROLL_INTO_ENABLED,
      syncCollections: settings.syncCollections,
      syncEnvironments: settings.syncEnvironments,
      syncHistory: settings.syncHistory,
    })
  })
}

export function logHoppRequestRunToAnalytics(ev: HoppRequestEvent) {
  analytics.logEvent("hopp-request", ev)
}
