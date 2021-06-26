/* eslint-disable no-restricted-globals, no-restricted-syntax */

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
import {
  restCollectionStore,
  graphqlCollectionStore,
  setGraphqlCollections,
  setRESTCollections,
} from "./collections"
import { replaceEnvironments, environments$ } from "./environments"

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

  if (vuexData.postwoman && vuexData.postwoman.collections) {
    const restColls = vuexData.postwoman.collections
    window.localStorage.setItem("collections", JSON.stringify(restColls))

    delete vuexData.postwoman.collections
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (vuexData.postwoman && vuexData.postwoman.collectionsGraphql) {
    const gqlColls = vuexData.postwoman.collectionsGraphql
    window.localStorage.setItem("collectionsGraphql", JSON.stringify(gqlColls))

    delete vuexData.postwoman.collectionsGraphql
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (vuexData.postwoman && vuexData.postwoman.environments) {
    const envs = vuexData.postwoman.environments
    window.localStorage.setItem("environments", JSON.stringify(envs))

    delete vuexData.postwoman.environments
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

function setupCollectionsPersistence() {
  const restCollectionData = JSON.parse(
    window.localStorage.getItem("collections") || "[]"
  )

  const graphqlCollectionData = JSON.parse(
    window.localStorage.getItem("collectionsGraphql") || "[]"
  )

  setRESTCollections(restCollectionData)
  setGraphqlCollections(graphqlCollectionData)

  restCollectionStore.subject$.subscribe(({ state }) => {
    window.localStorage.setItem("collections", JSON.stringify(state))
  })

  graphqlCollectionStore.subject$.subscribe(({ state }) => {
    window.localStorage.setItem("collectionsGraphql", JSON.stringify(state))
  })
}

function setupEnvironmentsPersistence() {
  const environmentsData = JSON.parse(
    window.localStorage.getItem("environments") || "[]"
  )

  replaceEnvironments(environmentsData)

  environments$.subscribe((envs) => {
    window.localStorage.setItem("environments", JSON.stringify(envs))
  })
}

export function setupLocalPersistence() {
  checkAndMigrateOldSettings()

  setupSettingsPersistence()
  setupHistoryPersistence()
  setupCollectionsPersistence()
  setupEnvironmentsPersistence()
}

/**
 * Gets a value in LocalStorage.
 *
 * NOTE: Use LocalStorage to only store non-reactive simple data
 * For more complex data, use stores and connect it to localpersistence
 */
export function getLocalConfig(name: string) {
  return window.localStorage.getItem(name)
}

/**
 * Sets a value in LocalStorage.
 *
 * NOTE: Use LocalStorage to only store non-reactive simple data
 * For more complex data, use stores and connect it to localpersistence
 */
export function setLocalConfig(key: string, value: string) {
  window.localStorage.setItem(key, value)
}

/**
 * Clear config value in LocalStorage.
 * @param key Key to be cleared
 */
export function removeLocalConfig(key: string) {
  window.localStorage.removeItem(key)
}
