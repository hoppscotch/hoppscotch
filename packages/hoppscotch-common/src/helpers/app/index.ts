import { platform } from "~/platform"
import { sync } from "~/lib/sync/defs"

let initialized = false

export function initializeApp() {
  if (!initialized) {
    try {
      platform.auth.performAuthInit()
      sync.settings.initSettingsSync()
      sync.collections.initCollectionsSync()
      sync.history.initHistorySync()
      sync.environments.initEnvironmentsSync()
      platform.analytics?.initAnalytics()

      initialized = true
    } catch (_e) {
      // initializeApp throws exception if we reinitialize
      initialized = true
    }
  }
}
