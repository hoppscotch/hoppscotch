import { platform } from "~/platform"

let initialized = false

export function initializeApp() {
  if (!initialized) {
    try {
      platform.auth.performAuthInit()
      platform.sync.settings.initSettingsSync()
      platform.sync.collections.initCollectionsSync()
      platform.sync.history.initHistorySync()
      platform.sync.environments.initEnvironmentsSync()
      platform.analytics?.initAnalytics()

      initialized = true
    } catch (e) {
      // initializeApp throws exception if we reinitialize
      initialized = true
    }
  }
}
