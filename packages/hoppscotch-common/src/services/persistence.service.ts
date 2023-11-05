/* eslint-disable no-restricted-globals, no-restricted-syntax */

import {
  Environment,
  translateToNewGQLCollection,
  translateToNewRESTCollection,
} from "@hoppscotch/data"
import { StorageLike, watchDebounced } from "@vueuse/core"
import { Service } from "dioc"
import { assign, clone, isEmpty } from "lodash-es"

import { getService } from "~/modules/dioc"

import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"

import { MQTTRequest$, setMQTTRequest } from "../newstore/MQTTSession"
import { SSERequest$, setSSERequest } from "../newstore/SSESession"
import { SIORequest$, setSIORequest } from "../newstore/SocketIOSession"
import { WSRequest$, setWSRequest } from "../newstore/WebSocketSession"
import {
  graphqlCollectionStore,
  restCollectionStore,
  setGraphqlCollections,
  setRESTCollections,
} from "../newstore/collections"
import {
  addGlobalEnvVariable,
  environments$,
  globalEnv$,
  replaceEnvironments,
  selectedEnvironmentIndex$,
  setGlobalEnvVariables,
  setSelectedEnvironmentIndex,
} from "../newstore/environments"
import {
  graphqlHistoryStore,
  restHistoryStore,
  setGraphqlHistoryEntries,
  setRESTHistoryEntries,
  translateToNewGQLHistory,
  translateToNewRESTHistory,
} from "../newstore/history"
import { bulkApplyLocalState, localStateStore } from "../newstore/localstate"
import {
  HoppAccentColor,
  HoppBgColor,
  applySetting,
  bulkApplySettings,
  getDefaultSettings,
  performSettingsDataMigrations,
  settingsStore,
} from "../newstore/settings"

/**
 * This service compiles persistence logic across the codebase
 */
export class PersistenceService extends Service {
  public static readonly ID = "PERSISTENCE_SERVICE"

  public hoppLocalConfigStorage: StorageLike = localStorage

  constructor() {
    super()
  }

  private checkAndMigrateOldSettings() {
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
      const settingsData = assign(
        clone(getDefaultSettings()),
        postwoman.settings
      )

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
      const color = window.localStorage.getItem(
        "nuxt-color-mode"
      ) as HoppBgColor
      applySetting("BG_COLOR", color)

      window.localStorage.removeItem("nuxt-color-mode")
    }
  }

  private setupLocalStatePersistence() {
    const localStateData = JSON.parse(
      window.localStorage.getItem("localState") ?? "{}"
    )

    if (localStateData) bulkApplyLocalState(localStateData)

    localStateStore.subject$.subscribe((state) => {
      window.localStorage.setItem("localState", JSON.stringify(state))
    })
  }

  private setupSettingsPersistence() {
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

  private setupHistoryPersistence() {
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

  private setupCollectionsPersistence() {
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

  private setupEnvironmentsPersistence() {
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

  private setupSelectedEnvPersistence() {
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

  private setupWebsocketPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("WebsocketRequest") || "null"
    )

    setWSRequest(request)

    WSRequest$.subscribe((req) => {
      window.localStorage.setItem("WebsocketRequest", JSON.stringify(req))
    })
  }

  private setupSocketIOPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("SocketIORequest") || "null"
    )

    setSIORequest(request)

    SIORequest$.subscribe((req) => {
      window.localStorage.setItem("SocketIORequest", JSON.stringify(req))
    })
  }

  private setupSSEPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("SSERequest") || "null"
    )

    setSSERequest(request)

    SSERequest$.subscribe((req) => {
      window.localStorage.setItem("SSERequest", JSON.stringify(req))
    })
  }

  private setupMQTTPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("MQTTRequest") || "null"
    )

    setMQTTRequest(request)

    MQTTRequest$.subscribe((req) => {
      window.localStorage.setItem("MQTTRequest", JSON.stringify(req))
    })
  }

  private setupGlobalEnvsPersistence() {
    const globals: Environment["variables"] = JSON.parse(
      window.localStorage.getItem("globalEnv") || "[]"
    )

    setGlobalEnvVariables(globals)

    globalEnv$.subscribe((vars) => {
      window.localStorage.setItem("globalEnv", JSON.stringify(vars))
    })
  }

  private setupGQLTabsPersistence() {
    const tabService = getService(GQLTabService)

    try {
      const state = window.localStorage.getItem("gqlTabState")
      if (state) {
        const data = JSON.parse(state)
        tabService.loadTabsFromPersistedState(data)
      }
    } catch (e) {
      console.log("hit catch block")
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

  // TODO: Graceful error handling ?
  public setupRESTTabsPersistence() {
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

  public setupLocalPersistence() {
    this.checkAndMigrateOldSettings()

    this.setupLocalStatePersistence()
    this.setupSettingsPersistence()
    this.setupRESTTabsPersistence()

    this.setupGQLTabsPersistence()

    this.setupHistoryPersistence()
    this.setupCollectionsPersistence()
    this.setupGlobalEnvsPersistence()
    this.setupEnvironmentsPersistence()
    this.setupSelectedEnvPersistence()
    this.setupWebsocketPersistence()
    this.setupSocketIOPersistence()
    this.setupSSEPersistence()
    this.setupMQTTPersistence()
  }

  /**
   * Gets a value from LocalStorage.
   *
   * NOTE: Use LocalStorage to only store non-reactive simple data
   * For more complex data, use stores and connect it to `PersistenceService`
   */
  public getLocalConfig(name: string) {
    return window.localStorage.getItem(name)
  }

  /**
   * Sets a value in LocalStorage.
   *
   * NOTE: Use LocalStorage to only store non-reactive simple data
   * For more complex data, use stores and connect it to `PersistenceService`
   */
  public setLocalConfig(key: string, value: string) {
    window.localStorage.setItem(key, value)
  }

  /**
   * Clear config value in LocalStorage.
   * @param key Key to be cleared
   */
  public removeLocalConfig(key: string) {
    window.localStorage.removeItem(key)
  }
}
