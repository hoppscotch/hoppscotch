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

import { getService } from "~/modules/dioc"

import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"

import { getI18n } from "~/modules/i18n"
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
  MQTT_REQUEST_SCHEMA,
  SOCKET_IO_REQUEST_SCHEMA,
  SSE_REQUEST_SCHEMA,
  WEBSOCKET_REQUEST_SCHEMA,
} from "./validation-schemas"

/**
 * This service compiles persistence logic across the codebase
 */
export class PersistenceService extends Service {
  public static readonly ID = "PERSISTENCE_SERVICE"

  public hoppLocalConfigStorage: StorageLike = localStorage

  private t = getI18n()

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

    // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
    // const result = VUEX_SCHEMA.safeParse(vuexData)
    // if (!result.success) {
    //   this.t("local_storage_read.vuex_schema_mismatch")
    //   window.localStorage.setItem(
    //     "vuex-backup",
    //     JSON.stringify(vuexData)
    //   )
    // }

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

    const themeColor = window.localStorage.getItem("THEME_COLOR")
    if (themeColor) {
      const result = z.enum(HoppAccentColors).safeParse(themeColor)
      console.log(result)
      if (!result.success) {
        this.t("local_storage_read.theme_color_schema_mismatch")
        window.localStorage.setItem("THEME_COLOR-backup", themeColor)
      }

      applySetting("THEME_COLOR", themeColor as HoppAccentColor)
      window.localStorage.removeItem("THEME_COLOR")
    }

    const color = window.localStorage.getItem("nuxt-color-mode")
    if (color) {
      const result = z.enum(HoppBgColors).safeParse(color)
      if (!result.success) {
        this.t("local_storage_read.nuxt_color_mode_schema_mismatch")
        window.localStorage.setItem("nuxt-color-mode-backup", color)
      }

      applySetting("BG_COLOR", color as HoppBgColor)
      window.localStorage.removeItem("nuxt-color-mode")
    }
  }

  private setupLocalStatePersistence() {
    const localStateData = JSON.parse(
      window.localStorage.getItem("localState") ?? "{}"
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
      this.t("local_storage_read.local_state_schema_mismatch")
      window.localStorage.setItem(
        "localState-backup",
        JSON.stringify(localStateData)
      )
    }

    if (localStateData) bulkApplyLocalState(localStateData)

    localStateStore.subject$.subscribe((state) => {
      window.localStorage.setItem("localState", JSON.stringify(state))
    })
  }

  private setupSettingsPersistence() {
    const settingsData = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
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
      this.t("local_storage_read.settings_schema_mismatch")
      window.localStorage.setItem(
        "settings-backup",
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
      window.localStorage.setItem("settings", JSON.stringify(settings))
    })
  }

  private setupHistoryPersistence() {
    const restHistoryData = JSON.parse(
      window.localStorage.getItem("history") || "[]"
    )
    const graphqlHistoryData = JSON.parse(
      window.localStorage.getItem("graphqlHistory") || "[]"
    )

    // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
    // const restHistorySchemaParsedresult = z.array(REST_HISTORY_ENTRY_SCHEMA).safeParse(restHistoryData)
    // if (!restHistorySchemaParsedresult.success) {
    //   this.t("local_storage_read.rest_history_schema_mismatch")
    //   window.localStorage.setItem(
    //     "history-backup",
    //     JSON.stringify(restHistoryData)
    //   )
    // }

    // const gqlHistorySchemaParsedresult = z.array(GQL_HISTORY_ENTRY_SCHEMA).safeParse(graphqlHistoryData)
    // if (!gqlHistorySchemaParsedresult.success) {
    //   this.t("local_storage_read.graphql_history_schema_mismatch")
    //   window.localStorage.setItem(
    //     "graphqlHistory-backup",
    //     JSON.stringify(graphqlHistoryData)
    //   )
    // }

    const translatedRestHistoryData = restHistoryData.map(
      translateToNewRESTHistory
    )
    const translatedGraphqlHistoryData = graphqlHistoryData.map(
      translateToNewGQLHistory
    )

    setRESTHistoryEntries(translatedRestHistoryData)
    setGraphqlHistoryEntries(translatedGraphqlHistoryData)

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
    )
    const graphqlCollectionData = JSON.parse(
      window.localStorage.getItem("collectionsGraphql") || "[]"
    )

    // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
    // const restCollectionsSchemaParsedresult = z.array(REST_COLLECTION_SCHEMA).safeParse(restCollectionData)
    // if (!restCollectionsSchemaParsedresult.success) {
    //   this.t("local_storage_read.rest_collections_schema_mismatch")
    //   window.localStorage.setItem(
    //     "collections-backup",
    //     JSON.stringify(restCollectionData)
    //   )
    // }

    // const gqlCollectionsSchemaParsedresult = z.array(GQL_COLLECTION_SCHEMA).safeParse(graphqlCollectionData)
    // if (!gqlCollectionsSchemaParsedresult.success) {
    //   this.t("local_storage_read.graphql_collections_schema_mismatch")
    //   window.localStorage.setItem(
    //     "collectionsGraphql-backup",
    //     JSON.stringify(graphqlCollectionData)
    //   )
    // }

    const translatedRestCollectionData = restCollectionData.map(
      translateToNewRESTCollection
    )
    const translatedGraphqlCollectionData = graphqlCollectionData.map(
      translateToNewGQLCollection
    )

    setRESTCollections(translatedRestCollectionData)
    setGraphqlCollections(translatedGraphqlCollectionData)

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

    const isValidationSuccessful = environmentsData.every((env) => {
      const result = Environment.safeParse(env)
      return result.type === "ok"
    })
    if (!isValidationSuccessful) {
      this.t("local_storage_read.environments_schema_mismatch")
      window.localStorage.setItem(
        "environments-backup",
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

    // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
    // const result = SELECTED_ENV_INDEX_SCHEMA.safeParse(selectedEnvIndex)
    // if (!result.success) {
    //   this.t("local_storage_read.selected_env_index_schema_mismatch")
    //   window.localStorage.setItem(
    //     "selectedEnvIndex-backup",
    //     JSON.stringify(selectedEnvIndex)
    //   )
    // }

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

    const result = WEBSOCKET_REQUEST_SCHEMA.safeParse(request)
    if (!result.success) {
      this.t("local_storage_read.websocket_request_schema_mismatch")
      window.localStorage.setItem(
        "WebsocketRequest-backup",
        JSON.stringify(request)
      )
    }

    setWSRequest(request)

    WSRequest$.subscribe((req) => {
      window.localStorage.setItem("WebsocketRequest", JSON.stringify(req))
    })
  }

  private setupSocketIOPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("SocketIORequest") || "null"
    )

    const result = SOCKET_IO_REQUEST_SCHEMA.safeParse(request)
    if (!result.success) {
      this.t("local_storage_read.socket_io_request_schema_mismatch")
      window.localStorage.setItem(
        "SocketIORequest-backup",
        JSON.stringify(request)
      )
    }

    setSIORequest(request)

    SIORequest$.subscribe((req) => {
      window.localStorage.setItem("SocketIORequest", JSON.stringify(req))
    })
  }

  private setupSSEPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("SSERequest") || "null"
    )

    const result = SSE_REQUEST_SCHEMA.safeParse(request)
    if (!result.success) {
      this.t("local_storage_read.sse_request_schema_mismatch")
      window.localStorage.setItem("SSERequest-backup", JSON.stringify(request))
    }

    setSSERequest(request)

    SSERequest$.subscribe((req) => {
      window.localStorage.setItem("SSERequest", JSON.stringify(req))
    })
  }

  private setupMQTTPersistence() {
    const request = JSON.parse(
      window.localStorage.getItem("MQTTRequest") || "null"
    )

    const result = MQTT_REQUEST_SCHEMA.safeParse(request)
    if (!result.success) {
      this.t("local_storage_read.mqtt_request_schema_mismatch")
      window.localStorage.setItem("MQTTRequest-backup", JSON.stringify(request))
    }

    setMQTTRequest(request)

    MQTTRequest$.subscribe((req) => {
      window.localStorage.setItem("MQTTRequest", JSON.stringify(req))
    })
  }

  private setupGlobalEnvsPersistence() {
    const globals: Environment["variables"] = JSON.parse(
      window.localStorage.getItem("globalEnv") || "[]"
    )

    const result = GLOBAL_ENV_SCHEMA.safeParse(globals)
    if (!result.success) {
      this.t("local_storage_read.global_env_schema_mismatch")
      window.localStorage.setItem("globalEnv-backup", JSON.stringify(globals))
    }

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

        // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
        // const result = GQL_TAB_STATE_SCHEMA.safeParse(state)
        // if (!result.success) {
        //   this.t("local_storage_read.gql_tab_state_schema_mismatch")
        //   window.localStorage.setItem(
        //     "gqlTabState-backup",
        //     JSON.stringify(state)
        //   )
        // }

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

  public setupRESTTabsPersistence() {
    const tabService = getService(RESTTabService)

    try {
      const state = window.localStorage.getItem("restTabState")
      if (state) {
        const data = JSON.parse(state)

        // TODO: Enable once the support for using versioned entity schemas within other schemas is added to verzod
        // const result = REST_TAB_STATE_SCHEMA.safeParse(state)
        // if (!result.success) {
        //   this.t("local_storage_read.rest_tab_state_schema_mismatch")
        //   window.localStorage.setItem("restTabState-backup", JSON.stringify(state))
        // }

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
