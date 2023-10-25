/* eslint-disable no-restricted-globals, no-restricted-syntax */

import { clone, assign, isEmpty } from "lodash-es"
import {
  translateToNewRESTCollection,
  translateToNewGQLCollection,
  Environment,
} from "@hoppscotch/data"
import {
  settingsStore,
  bulkApplySettings,
  getDefaultSettings,
  applySetting,
  HoppAccentColor,
  HoppBgColor,
  performSettingsDataMigrations,
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
} from "./collections"
import {
  replaceEnvironments,
  environments$,
  addGlobalEnvVariable,
  setGlobalEnvVariables,
  globalEnv$,
  setSelectedEnvironmentIndex,
  selectedEnvironmentIndex$,
} from "./environments"
import { WSRequest$, setWSRequest } from "./WebSocketSession"
import { SIORequest$, setSIORequest } from "./SocketIOSession"
import { SSERequest$, setSSERequest } from "./SSESession"
import { MQTTRequest$, setMQTTRequest } from "./MQTTSession"
import { bulkApplyLocalState, localStateStore } from "./localstate"
import { StorageLike, watchDebounced } from "@vueuse/core"
import { getService } from "~/modules/dioc"
import { RESTTabService } from "~/services/tab/rest"
import { GQLTabService } from "~/services/tab/graphql"
import { z } from "zod"
import { CookieJarService } from "~/services/cookie-jar.service"
import { watch } from "vue"

function checkAndMigrateOldSettings() {
  if (window.localStorage.getItem("selectedEnvIndex")) {
    const index = window.localStorage.getItem("selectedEnvIndex")
    if (index) {
      if (index === "-1") {
        window.localStorage.setItem(
          "selectedEnvIndex",
          JSON.stringify({
            type: "NO_ENV_SELECTED",
          })
        )
      } else if (Number(index) >= 0) {
        window.localStorage.setItem(
          "selectedEnvIndex",
          JSON.stringify({
            type: "MY_ENV",
            index: parseInt(index),
          })
        )
      }
    }
  }

  const vuexData = JSON.parse(window.localStorage.getItem("vuex") || "{}")

  if (isEmpty(vuexData)) return

  const { postwoman } = vuexData

  if (!isEmpty(postwoman?.settings)) {
    const settingsData = assign(clone(getDefaultSettings()), postwoman.settings)

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

function setupLocalStatePersistence() {
  const localStateData = JSON.parse(
    window.localStorage.getItem("localState") ?? "{}"
  )

  if (localStateData) bulkApplyLocalState(localStateData)

  localStateStore.subject$.subscribe((state) => {
    window.localStorage.setItem("localState", JSON.stringify(state))
  })
}

function setupSettingsPersistence() {
  const settingsData = JSON.parse(
    window.localStorage.getItem("settings") || "{}"
  )

  const updatedSettings = settingsData
    ? performSettingsDataMigrations(settingsData)
    : settingsData

  if (updatedSettings) {
    bulkApplySettings(updatedSettings)
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

const cookieSchema = z.record(z.array(z.string()))

function setupCookiesPersistence() {
  const cookieJarService = getService(CookieJarService)

  try {
    const cookieData = JSON.parse(
      window.localStorage.getItem("cookieJar") || "{}"
    )

    const parseResult = cookieSchema.safeParse(cookieData)

    if (parseResult.success) {
      for (const domain in parseResult.data) {
        cookieJarService.bulkApplyCookiesToDomain(
          parseResult.data[domain],
          domain
        )
      }
    }
  } catch (e) {}

  watch(cookieJarService.cookieJar, (cookieJar) => {
    const data = JSON.stringify(Object.fromEntries(cookieJar.entries()))

    window.localStorage.setItem("cookieJar", data)
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
  const selectedEnvIndex = JSON.parse(
    window.localStorage.getItem("selectedEnvIndex") ?? "null"
  )

  // If there is a selected env index, set it to the store else set it to null
  if (selectedEnvIndex) {
    setSelectedEnvironmentIndex(selectedEnvIndex)
  } else {
    setSelectedEnvironmentIndex({
      type: "NO_ENV_SELECTED",
    })
  }

  selectedEnvironmentIndex$.subscribe((envIndex) => {
    window.localStorage.setItem("selectedEnvIndex", JSON.stringify(envIndex))
  })
}

function setupWebsocketPersistence() {
  const request = JSON.parse(
    window.localStorage.getItem("WebsocketRequest") || "null"
  )

  setWSRequest(request)

  WSRequest$.subscribe((req) => {
    window.localStorage.setItem("WebsocketRequest", JSON.stringify(req))
  })
}

function setupSocketIOPersistence() {
  const request = JSON.parse(
    window.localStorage.getItem("SocketIORequest") || "null"
  )

  setSIORequest(request)

  SIORequest$.subscribe((req) => {
    window.localStorage.setItem("SocketIORequest", JSON.stringify(req))
  })
}

function setupSSEPersistence() {
  const request = JSON.parse(
    window.localStorage.getItem("SSERequest") || "null"
  )

  setSSERequest(request)

  SSERequest$.subscribe((req) => {
    window.localStorage.setItem("SSERequest", JSON.stringify(req))
  })
}

function setupMQTTPersistence() {
  const request = JSON.parse(
    window.localStorage.getItem("MQTTRequest") || "null"
  )

  setMQTTRequest(request)

  MQTTRequest$.subscribe((req) => {
    window.localStorage.setItem("MQTTRequest", JSON.stringify(req))
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

// TODO: Graceful error handling ?
export function setupRESTTabsPersistence() {
  const tabService = getService(RESTTabService)

  try {
    const state = window.localStorage.getItem("restTabState")
    if (state) {
      const data = JSON.parse(state)
      tabService.loadTabsFromPersistedState(data)
    }
  } catch (e) {
    console.error(
      `Failed parsing persisted tab state, state:`,
      window.localStorage.getItem("restTabState")
    )
  }

  watchDebounced(
    tabService.persistableTabState,
    (state) => {
      window.localStorage.setItem("restTabState", JSON.stringify(state))
    },
    { debounce: 500, deep: true }
  )
}

function setupGQLTabsPersistence() {
  const tabService = getService(GQLTabService)

  try {
    const state = window.localStorage.getItem("gqlTabState")
    if (state) {
      const data = JSON.parse(state)
      tabService.loadTabsFromPersistedState(data)
    }
  } catch (e) {
    console.error(
      `Failed parsing persisted tab state, state:`,
      window.localStorage.getItem("gqlTabState")
    )
  }

  watchDebounced(
    tabService.persistableTabState,
    (state) => {
      window.localStorage.setItem("gqlTabState", JSON.stringify(state))
    },
    { debounce: 500, deep: true }
  )
}

export function setupLocalPersistence() {
  checkAndMigrateOldSettings()

  setupLocalStatePersistence()
  setupSettingsPersistence()
  setupRESTTabsPersistence()

  setupGQLTabsPersistence()

  setupHistoryPersistence()
  setupCollectionsPersistence()
  setupGlobalEnvsPersistence()
  setupEnvironmentsPersistence()
  setupSelectedEnvPersistence()
  setupWebsocketPersistence()
  setupSocketIOPersistence()
  setupSSEPersistence()
  setupMQTTPersistence()

  setupCookiesPersistence()
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

/**
 * The storage system we are using in the application.
 * NOTE: This is a placeholder for being used in app.
 * This entire redirection of localStorage is to allow for
 * not refactoring the entire app code when we refactor when
 * we are building the native (which may lack localStorage,
 * or use a custom system)
 */
export const hoppLocalConfigStorage: StorageLike = localStorage
