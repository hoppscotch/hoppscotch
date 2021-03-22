import { settingsStore, bulkApplySettings, defaultSettings } from "./settings"
import clone from "lodash/clone"
import assign from "lodash/assign"

function checkAndMigrateOldSettings() {
  // Don't do migration if the new settings object exists
  if (window.localStorage.getItem("settings")) return

  const vuexData = JSON.parse(window.localStorage.getItem("vuex") || "{}")
  if (vuexData === {}) return
  
  const settingsData = clone(defaultSettings)
  assign(settingsData, vuexData.postwoman.settings)

  window.localStorage.setItem("settings", JSON.stringify(settingsData))
}

function setupSettingsPersistence() {
  const settingsData = JSON.parse(window.localStorage.getItem("settings") || "{}")

  if (settingsData) {
    bulkApplySettings(settingsData)
  }
  

  settingsStore.subject$
    .subscribe(settings => {
      window.localStorage.setItem("settings", JSON.stringify(settings))
    })
}

export function setupLocalPersistence() {
  checkAndMigrateOldSettings()

  setupSettingsPersistence()
}
