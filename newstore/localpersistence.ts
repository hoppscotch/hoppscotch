import clone from "lodash/clone"
import assign from "lodash/assign"
import eq from "lodash/eq"
import { settingsStore, bulkApplySettings, defaultSettings } from "./settings"
import {
  restHistoryStore,
  graphqlHistoryStore,
  setRESTHistoryEntries,
  setGraphqlHistoryEntries,
} from "./history"

function checkAndMigrateOldSettings() {
  const vuexData = JSON.parse(window.localStorage.getItem("vuex") || "{}")
  if (eq(vuexData, {})) return

  if (vuexData.postwoman && vuexData.postwoman.settings) {
    const settingsData = clone(defaultSettings)
    assign(settingsData, vuexData.postwoman.settings)

    window.localStorage.setItem("settings", JSON.stringify(settingsData))

    delete vuexData.postwoman.settings
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }
}

function setupSettingsPersistence() {
  const settingsData = JSON.parse(
    window.localStorage.getItem("settings") || "{}"
  )

  if (settingsData) {
    bulkApplySettings(settingsData)
  }

  settingsStore.subject$.subscribe((settings) => {
    window.localStorage.setItem("settings", JSON.stringify(settings))
  })
}

function setupHistoryPersistence() {
  const restHistoryData = JSON.parse(
    window.localStorage.getItem("history") || "[]"
  )

  const graphqlHistoryData = JSON.parse(
    window.localStorage.getItem("graphqlHistory") || "[]"
  )

  setRESTHistoryEntries(restHistoryData)
  setGraphqlHistoryEntries(graphqlHistoryData)

  restHistoryStore.subject$.subscribe(({ state }) => {
    window.localStorage.setItem("history", JSON.stringify(state))
  })

  graphqlHistoryStore.subject$.subscribe(({ state }) => {
    window.localStorage.setItem("graphqlHistory", JSON.stringify(state))
  })
}

export function setupLocalPersistence() {
  checkAndMigrateOldSettings()

  setupSettingsPersistence()
  setupHistoryPersistence()
}
