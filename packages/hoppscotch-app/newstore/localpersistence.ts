/* eslint-disable no-restricted-globals, no-restricted-syntax */

import clone from "lodash/clone"
import assign from "lodash/assign"
import isEmpty from "lodash/isEmpty"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import {
  settingsStore,
  bulkApplySettings,
  defaultSettings,
  applySetting,
  HoppAccentColor,
  HoppBgColor,
} from "./settings"
import {
  restHistoryStore,
  graphqlHistoryStore,
  setRESTHistoryEntries,
  setGraphqlHistoryEntries,
  translateToNewRESTHistory,
  translateToNewGQLHistory,
} from "./history"
import {
  restCollectionStore,
  graphqlCollectionStore,
  setGraphqlCollections,
  setRESTCollections,
  translateToNewRESTCollection,
  translateToNewGQLCollection,
} from "./collections"
import {
  replaceEnvironments,
  environments$,
  Environment,
  addGlobalEnvVariable,
  setGlobalEnvVariables,
  globalEnv$,
  selectedEnvIndex$,
  setCurrentEnvironment,
} from "./environments"
import { restRequest$, setRESTRequest } from "./RESTSession"
import { translateToNewRequest } from "~/helpers/types/HoppRESTRequest"

function checkAndMigrateOldSettings() {
  const vuexData = JSON.parse(window.localStorage.getItem("vuex") || "{}")
  if (isEmpty(vuexData)) return

  const { postwoman } = vuexData

  if (!isEmpty(postwoman?.settings)) {
    const settingsData = assign(clone(defaultSettings), postwoman.settings)

    window.localStorage.setItem("settings", JSON.stringify(settingsData))

    delete postwoman.settings
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (postwoman?.collections) {
    window.localStorage.setItem(
      "collections",
      JSON.stringify(postwoman.collections)
    )

    delete postwoman.collections
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (postwoman?.collectionsGraphql) {
    window.localStorage.setItem(
      "collectionsGraphql",
      JSON.stringify(postwoman.collectionsGraphql)
    )

    delete postwoman.collectionsGraphql
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (postwoman?.environments) {
    window.localStorage.setItem(
      "environments",
      JSON.stringify(postwoman.environments)
    )

    delete postwoman.environments
    window.localStorage.setItem("vuex", JSON.stringify(vuexData))
  }

  if (window.localStorage.getItem("THEME_COLOR")) {
    const themeColor = window.localStorage.getItem("THEME_COLOR")
    applySetting("THEME_COLOR", themeColor as HoppAccentColor)

    window.localStorage.removeItem("THEME_COLOR")
  }

  if (window.localStorage.getItem("nuxt-color-mode")) {
    const color = window.localStorage.getItem("nuxt-color-mode") as HoppBgColor
    applySetting("BG_COLOR", color)

    window.localStorage.removeItem("nuxt-color-mode")
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
  ).map(translateToNewRESTHistory)

  const graphqlHistoryData = JSON.parse(
    window.localStorage.getItem("graphqlHistory") || "[]"
  ).map(translateToNewGQLHistory)

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
  ).map(translateToNewRESTCollection)

  const graphqlCollectionData = JSON.parse(
    window.localStorage.getItem("collectionsGraphql") || "[]"
  ).map(translateToNewGQLCollection)

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
  const environmentsData: Environment[] = JSON.parse(
    window.localStorage.getItem("environments") || "[]"
  )

  // Check if a global env is defined and if so move that to globals
  const globalIndex = environmentsData.findIndex(
    (x) => x.name.toLowerCase() === "globals"
  )

  if (globalIndex !== -1) {
    const globalEnv = environmentsData[globalIndex]
    globalEnv.variables.forEach((variable) => addGlobalEnvVariable(variable))

    // Remove global from environments
    environmentsData.splice(globalIndex, 1)

    // Just sync the changes manually
    window.localStorage.setItem(
      "environments",
      JSON.stringify(environmentsData)
    )
  }

  replaceEnvironments(environmentsData)

  environments$.subscribe((envs) => {
    window.localStorage.setItem("environments", JSON.stringify(envs))
  })
}

function setupSelectedEnvPersistence() {
  const selectedEnvIndex = pipe(
    // Value from local storage can be nullable
    O.fromNullable(window.localStorage.getItem("selectedEnvIndex")),
    O.map(parseInt), // If not null, parse to integer
    O.chain(
      O.fromPredicate(
        Number.isInteger // Check if the number is proper int (not NaN)
      )
    ),
    O.getOrElse(() => -1) // If all the above conditions pass, we are good, else set default value (-1)
  )

  setCurrentEnvironment(selectedEnvIndex)

  selectedEnvIndex$.subscribe((index) => {
    window.localStorage.setItem("selectedEnvIndex", index.toString())
  })
}

function setupGlobalEnvsPersistence() {
  const globals: Environment["variables"] = JSON.parse(
    window.localStorage.getItem("globalEnv") || "[]"
  )

  setGlobalEnvVariables(globals)

  globalEnv$.subscribe((vars) => {
    window.localStorage.setItem("globalEnv", JSON.stringify(vars))
  })
}

function setupRequestPersistence() {
  const localRequest = JSON.parse(
    window.localStorage.getItem("restRequest") || "null"
  )

  if (localRequest) {
    const parsedLocal = translateToNewRequest(localRequest)
    setRESTRequest(parsedLocal)
  }

  restRequest$.subscribe((req) => {
    window.localStorage.setItem("restRequest", JSON.stringify(req))
  })
}

export function setupLocalPersistence() {
  checkAndMigrateOldSettings()

  setupSettingsPersistence()
  setupRequestPersistence()
  setupHistoryPersistence()
  setupCollectionsPersistence()
  setupGlobalEnvsPersistence()
  setupEnvironmentsPersistence()
  setupSelectedEnvPersistence()
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
