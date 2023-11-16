/* eslint-disable no-restricted-globals, no-restricted-syntax */

import {
  Environment,
  translateToNewGQLCollection,
  translateToNewRESTCollection,
} from "@hoppscotch/data"
import { StorageLike, watchDebounced } from "@vueuse/core"
import { Service } from "dioc"
import { assign, clone, isEmpty } from "lodash-es"
import { z } from "zod"

import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"

import { entityReference } from "verzod"
import { useToast } from "~/composables/toast"
import { MQTTRequest$, setMQTTRequest } from "../../newstore/MQTTSession"
import { SSERequest$, setSSERequest } from "../../newstore/SSESession"
import { SIORequest$, setSIORequest } from "../../newstore/SocketIOSession"
import { WSRequest$, setWSRequest } from "../../newstore/WebSocketSession"
import {
  graphqlCollectionStore,
  restCollectionStore,
  setGraphqlCollections,
  setRESTCollections,
} from "../../newstore/collections"
import {
  addGlobalEnvVariable,
  environments$,
  globalEnv$,
  replaceEnvironments,
  selectedEnvironmentIndex$,
  setGlobalEnvVariables,
  setSelectedEnvironmentIndex,
} from "../../newstore/environments"
import {
  graphqlHistoryStore,
  restHistoryStore,
  setGraphqlHistoryEntries,
  setRESTHistoryEntries,
  translateToNewGQLHistory,
  translateToNewRESTHistory,
} from "../../newstore/history"
import { bulkApplyLocalState, localStateStore } from "../../newstore/localstate"
import {
  HoppAccentColor,
  HoppAccentColors,
  HoppBgColor,
  HoppBgColors,
  applySetting,
  bulkApplySettings,
  getDefaultSettings,
  performSettingsDataMigrations,
  settingsStore,
} from "../../newstore/settings"
import {
  GLOBAL_ENV_SCHEMA,
  GQL_COLLECTION_SCHEMA,
  GQL_HISTORY_ENTRY_SCHEMA,
  GQL_TAB_STATE_SCHEMA,
  MQTT_REQUEST_SCHEMA,
  REST_COLLECTION_SCHEMA,
  REST_HISTORY_ENTRY_SCHEMA,
  REST_TAB_STATE_SCHEMA,
  SELECTED_ENV_INDEX_SCHEMA,
  SOCKET_IO_REQUEST_SCHEMA,
  SSE_REQUEST_SCHEMA,
  VUEX_SCHEMA,
  WEBSOCKET_REQUEST_SCHEMA,
} from "./validation-schemas"

/**
 * This service compiles persistence logic across the codebase
 */
export class PersistenceService extends Service {
  public static readonly ID = "PERSISTENCE_SERVICE"

  private readonly restTabService = this.bind(RESTTabService)
  private readonly gqlTabService = this.bind(GQLTabService)

  public hoppLocalConfigStorage: StorageLike = localStorage

  constructor() {
    super()
  }

  private showErrorToast(localStorageKey: string) {
    const toast = useToast()
    toast.error(
      `There's a mismatch with the expected schema for the value corresponding to ${localStorageKey} read from localStorage, keeping a backup in ${localStorageKey}-backup`
    )
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

    const vuexKey = "vuex"
    let vuexData = JSON.parse(window.localStorage.getItem(vuexKey) || "{}")

    if (isEmpty(vuexData)) return

    const result = VUEX_SCHEMA.safeParse(vuexData)
    if (result.success) {
      vuexData = result.data
    } else {
      this.showErrorToast(vuexKey)
      window.localStorage.setItem(`${vuexKey}-backup`, JSON.stringify(vuexData))
    }

    const { postwoman } = vuexData

    if (!isEmpty(postwoman?.settings)) {
      const settingsData = assign(
        clone(getDefaultSettings()),
        postwoman.settings
      )

      window.localStorage.setItem("settings", JSON.stringify(settingsData))

      delete postwoman.settings
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))
    }

    if (postwoman?.collections) {
      window.localStorage.setItem(
        "collections",
        JSON.stringify(postwoman.collections)
      )

      delete postwoman.collections
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))
    }

    if (postwoman?.collectionsGraphql) {
      window.localStorage.setItem(
        "collectionsGraphql",
        JSON.stringify(postwoman.collectionsGraphql)
      )

      delete postwoman.collectionsGraphql
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))
    }

    if (postwoman?.environments) {
      window.localStorage.setItem(
        "environments",
        JSON.stringify(postwoman.environments)
      )

      delete postwoman.environments
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))
    }

    const themeColorKey = "THEME_COLOR"
    const themeColorValue = window.localStorage.getItem(themeColorKey)
    if (themeColorValue) {
      const result = z.enum(HoppAccentColors).safeParse(themeColorValue)
      if (!result.success) {
        this.showErrorToast(themeColorKey)
        window.localStorage.setItem(`${themeColorKey}-backup`, themeColorValue)
      }

      applySetting(themeColorKey, themeColorValue as HoppAccentColor)
      window.localStorage.removeItem(themeColorKey)
    }

    const nuxtColorModeKey = "nuxt-color-mode"
    const nuxtColorModeValue = window.localStorage.getItem(nuxtColorModeKey)
    if (nuxtColorModeValue) {
      const result = z.enum(HoppBgColors).safeParse(nuxtColorModeValue)
      if (!result.success) {
        this.showErrorToast(nuxtColorModeKey)
        window.localStorage.setItem(
          `${nuxtColorModeKey}-backup`,
          nuxtColorModeValue
        )
      }

      applySetting("BG_COLOR", nuxtColorModeValue as HoppBgColor)
      window.localStorage.removeItem(nuxtColorModeKey)
    }
  }

  private setupLocalStatePersistence() {
    const localStateKey = "localState"
    const localStateData = JSON.parse(
      window.localStorage.getItem(localStateKey) ?? "{}"
    )

    const schema = z.union([
      z.object({}).strict(),
      z
        .object({
          REMEMBERED_TEAM_ID: z.optional(z.string()),
        })
        .strict(),
    ])

    const result = schema.safeParse(localStateData)
    if (!result.success) {
      this.showErrorToast(localStateKey)
      window.localStorage.setItem(
        `${localStateKey}-backup`,
        JSON.stringify(localStateData)
      )
    }

    if (localStateData) bulkApplyLocalState(localStateData)

    localStateStore.subject$.subscribe((state) => {
      window.localStorage.setItem(localStateKey, JSON.stringify(state))
    })
  }

  private setupSettingsPersistence() {
    const settingsKey = "settings"
    const settingsData = JSON.parse(
      window.localStorage.getItem(settingsKey) || "{}"
    )

    const schema = z.union([
      z.object({}).strict(),
      z.object({
        EXTENSIONS_ENABLED: z.optional(z.boolean()),
        PROXY_ENABLED: z.optional(z.boolean()),
      }),
    ])

    const result = schema.safeParse(settingsData)
    if (!result.success) {
      this.showErrorToast(settingsKey)
      window.localStorage.setItem(
        `${settingsKey}-backup`,
        JSON.stringify(settingsData)
      )
    }

    const updatedSettings = settingsData
      ? performSettingsDataMigrations(settingsData)
      : settingsData

    if (updatedSettings) {
      bulkApplySettings(updatedSettings)
    }

    settingsStore.subject$.subscribe((settings) => {
      window.localStorage.setItem(settingsKey, JSON.stringify(settings))
    })
  }

  private setupHistoryPersistence() {
    const restHistoryKey = "history"
    let restHistoryData = JSON.parse(
      window.localStorage.getItem(restHistoryKey) || "[]"
    )

    const graphqlHistoryKey = "graphqlHistory"
    let graphqlHistoryData = JSON.parse(
      window.localStorage.getItem(graphqlHistoryKey) || "[]"
    )

    // Validate data read from localStorage
    const restHistorySchemaParsedresult = z
      .array(REST_HISTORY_ENTRY_SCHEMA)
      .safeParse(restHistoryData)
    if (restHistorySchemaParsedresult.success) {
      restHistoryData = restHistorySchemaParsedresult.data
    } else {
      this.showErrorToast(restHistoryKey)
      window.localStorage.setItem(
        `${restHistoryKey}-backup`,
        JSON.stringify(restHistoryData)
      )
    }

    const gqlHistorySchemaParsedresult = z
      .array(GQL_HISTORY_ENTRY_SCHEMA)
      .safeParse(graphqlHistoryData)
    if (gqlHistorySchemaParsedresult.success) {
      graphqlHistoryData = gqlHistorySchemaParsedresult.data
    } else {
      this.showErrorToast(graphqlHistoryKey)
      window.localStorage.setItem(
        `${graphqlHistoryKey}-backup`,
        JSON.stringify(graphqlHistoryData)
      )
    }

    const translatedRestHistoryData = restHistoryData.map(
      translateToNewRESTHistory
    )
    const translatedGraphqlHistoryData = graphqlHistoryData.map(
      translateToNewGQLHistory
    )

    setRESTHistoryEntries(translatedRestHistoryData)
    setGraphqlHistoryEntries(translatedGraphqlHistoryData)

    restHistoryStore.subject$.subscribe(({ state }) => {
      window.localStorage.setItem(restHistoryKey, JSON.stringify(state))
    })

    graphqlHistoryStore.subject$.subscribe(({ state }) => {
      window.localStorage.setItem(graphqlHistoryKey, JSON.stringify(state))
    })
  }

  private setupCollectionsPersistence() {
    const restCollectionsKey = "collections"
    let restCollectionsData = JSON.parse(
      window.localStorage.getItem(restCollectionsKey) || "[]"
    )

    const graphqlCollectionsKey = "collectionsGraphql"
    let graphqlCollectionsData = JSON.parse(
      window.localStorage.getItem(graphqlCollectionsKey) || "[]"
    )

    const restCollectionsSchemaParsedresult = z
      .array(REST_COLLECTION_SCHEMA)
      .safeParse(restCollectionsData)
    if (restCollectionsSchemaParsedresult.success) {
      restCollectionsData = restCollectionsSchemaParsedresult.data
    } else {
      this.showErrorToast(restCollectionsKey)
      window.localStorage.setItem(
        `${restCollectionsKey}-backup`,
        JSON.stringify(restCollectionsData)
      )
    }

    const gqlCollectionsSchemaParsedresult = z
      .array(GQL_COLLECTION_SCHEMA)
      .safeParse(graphqlCollectionsData)
    if (gqlCollectionsSchemaParsedresult.success) {
      graphqlCollectionsData = gqlCollectionsSchemaParsedresult.data
    } else {
      this.showErrorToast(graphqlCollectionsKey)
      window.localStorage.setItem(
        `${graphqlCollectionsKey}-backup`,
        JSON.stringify(graphqlCollectionsData)
      )
    }

    const translatedRestCollectionsData = restCollectionsData.map(
      translateToNewRESTCollection
    )
    const translatedGraphqlCollectionsData = graphqlCollectionsData.map(
      translateToNewGQLCollection
    )

    setRESTCollections(translatedRestCollectionsData)
    setGraphqlCollections(translatedGraphqlCollectionsData)

    restCollectionStore.subject$.subscribe(({ state }) => {
      window.localStorage.setItem(restCollectionsKey, JSON.stringify(state))
    })

    graphqlCollectionStore.subject$.subscribe(({ state }) => {
      window.localStorage.setItem(graphqlCollectionsKey, JSON.stringify(state))
    })
  }

  private setupEnvironmentsPersistence() {
    const environmentsKey = "environments"
    let environmentsData: Environment[] = JSON.parse(
      window.localStorage.getItem(environmentsKey) || "[]"
    )

    const schema = z.array(entityReference(Environment))
    const result = schema.safeParse(environmentsData)
    if (result.success) {
      environmentsData = result.data
    } else {
      this.showErrorToast(environmentsKey)
      window.localStorage.setItem(
        `${environmentsKey}-backup`,
        JSON.stringify(environmentsData)
      )
    }

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
        environmentsKey,
        JSON.stringify(environmentsData)
      )
    }

    replaceEnvironments(environmentsData)

    environments$.subscribe((envs) => {
      window.localStorage.setItem(environmentsKey, JSON.stringify(envs))
    })
  }

  private setupSelectedEnvPersistence() {
    const selectedEnvIndexKey = "selectedEnvIndex"
    let selectedEnvIndexValue = JSON.parse(
      window.localStorage.getItem(selectedEnvIndexKey) ?? "null"
    )

    const result = SELECTED_ENV_INDEX_SCHEMA.safeParse(selectedEnvIndexValue)
    if (result.success) {
      selectedEnvIndexValue = result.data
    } else {
      this.showErrorToast(selectedEnvIndexKey)
      window.localStorage.setItem(
        `${selectedEnvIndexKey}-backup`,
        JSON.stringify(selectedEnvIndexValue)
      )
    }

    // If there is a selected env index, set it to the store else set it to null
    if (selectedEnvIndexValue) {
      setSelectedEnvironmentIndex(selectedEnvIndexValue)
    } else {
      setSelectedEnvironmentIndex({
        type: "NO_ENV_SELECTED",
      })
    }

    selectedEnvironmentIndex$.subscribe((envIndex) => {
      window.localStorage.setItem(selectedEnvIndexKey, JSON.stringify(envIndex))
    })
  }

  private setupWebsocketPersistence() {
    const wsRequestKey = "WebsocketRequest"
    let wsRequestData = JSON.parse(
      window.localStorage.getItem(wsRequestKey) || "null"
    )

    const result = WEBSOCKET_REQUEST_SCHEMA.safeParse(wsRequestData)
    if (result.success) {
      wsRequestData = result.data
    } else {
      this.showErrorToast(wsRequestKey)
      window.localStorage.setItem(
        `${wsRequestKey}-backup`,
        JSON.stringify(wsRequestData)
      )
    }

    setWSRequest(wsRequestData)

    WSRequest$.subscribe((req) => {
      window.localStorage.setItem(wsRequestKey, JSON.stringify(req))
    })
  }

  private setupSocketIOPersistence() {
    const sioRequestKey = "SocketIORequest"
    let sioRequestData = JSON.parse(
      window.localStorage.getItem(sioRequestKey) || "null"
    )

    const result = SOCKET_IO_REQUEST_SCHEMA.safeParse(sioRequestData)
    if (result.success) {
      sioRequestData = result.data
    } else {
      this.showErrorToast(sioRequestKey)
      window.localStorage.setItem(
        `${sioRequestKey}-backup`,
        JSON.stringify(sioRequestData)
      )
    }

    setSIORequest(sioRequestData)

    SIORequest$.subscribe((req) => {
      window.localStorage.setItem(sioRequestKey, JSON.stringify(req))
    })
  }

  private setupSSEPersistence() {
    const sseRequestKey = "SSERequest"
    let sseRequestData = JSON.parse(
      window.localStorage.getItem(sseRequestKey) || "null"
    )

    const result = SSE_REQUEST_SCHEMA.safeParse(sseRequestData)
    if (result.success) {
      sseRequestData = result.data
    } else {
      this.showErrorToast(sseRequestKey)
      window.localStorage.setItem(
        `${sseRequestKey}-backup`,
        JSON.stringify(sseRequestData)
      )
    }

    setSSERequest(sseRequestData)

    SSERequest$.subscribe((req) => {
      window.localStorage.setItem(sseRequestKey, JSON.stringify(req))
    })
  }

  private setupMQTTPersistence() {
    const mqttRequestKey = "MQTTRequest"
    let mqttRequestData = JSON.parse(
      window.localStorage.getItem(mqttRequestKey) || "null"
    )

    const result = MQTT_REQUEST_SCHEMA.safeParse(mqttRequestData)
    if (result.success) {
      mqttRequestData = result.data
    } else {
      this.showErrorToast(mqttRequestKey)
      window.localStorage.setItem(
        `${mqttRequestKey}-backup`,
        JSON.stringify(mqttRequestData)
      )
    }

    setMQTTRequest(mqttRequestData)

    MQTTRequest$.subscribe((req) => {
      window.localStorage.setItem(mqttRequestKey, JSON.stringify(req))
    })
  }

  private setupGlobalEnvsPersistence() {
    const globalEnvKey = "globalEnv"
    let globalEnvData: Environment["variables"] = JSON.parse(
      window.localStorage.getItem(globalEnvKey) || "[]"
    )

    const result = GLOBAL_ENV_SCHEMA.safeParse(globalEnvData)
    if (result.success) {
      globalEnvData = result.data
    } else {
      this.showErrorToast(globalEnvKey)
      window.localStorage.setItem(
        `${globalEnvKey}-backup`,
        JSON.stringify(globalEnvData)
      )
    }

    setGlobalEnvVariables(globalEnvData)

    globalEnv$.subscribe((vars) => {
      window.localStorage.setItem(globalEnvKey, JSON.stringify(vars))
    })
  }

  private setupGQLTabsPersistence() {
    const gqlTabStateKey = "gqlTabState"
    try {
      const gqlTabStateData = window.localStorage.getItem(gqlTabStateKey)
      if (gqlTabStateData) {
        let data = JSON.parse(gqlTabStateData)

        const result = GQL_TAB_STATE_SCHEMA.safeParse(data)
        if (result.success) {
          data = result.data
        } else {
          this.showErrorToast(gqlTabStateKey)
          window.localStorage.setItem(
            `${gqlTabStateKey}-backup`,
            JSON.stringify(data)
          )
        }

        this.gqlTabService.loadTabsFromPersistedState(data)
      }
    } catch (e) {
      console.error(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem(gqlTabStateKey)
      )
    }

    watchDebounced(
      this.gqlTabService.persistableTabState,
      (newGqlTabStateData) => {
        window.localStorage.setItem(
          gqlTabStateKey,
          JSON.stringify(newGqlTabStateData)
        )
      },
      { debounce: 500, deep: true }
    )
  }

  public setupRESTTabsPersistence() {
    const restTabStateKey = "restTabState"
    try {
      const restTabStateData = window.localStorage.getItem(restTabStateKey)
      if (restTabStateData) {
        let data = JSON.parse(restTabStateData)

        const result = REST_TAB_STATE_SCHEMA.safeParse(data)
        if (result.success) {
          data = result.data
        } else {
          this.showErrorToast(restTabStateKey)
          window.localStorage.setItem(
            `${restTabStateKey}-backup`,
            JSON.stringify(data)
          )
        }

        this.restTabService.loadTabsFromPersistedState(data)
      }
    } catch (e) {
      console.error(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem(restTabStateKey)
      )
    }

    watchDebounced(
      this.restTabService.persistableTabState,
      (newRestTabStateData) => {
        window.localStorage.setItem(
          restTabStateKey,
          JSON.stringify(newRestTabStateData)
        )
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
