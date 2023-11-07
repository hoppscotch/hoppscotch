/* eslint-disable no-restricted-globals, no-restricted-syntax */

import {
  Environment,
  translateToNewGQLCollection,
  translateToNewRESTCollection,
} from "@hoppscotch/data"
import { watchDebounced } from "@vueuse/core"
import { TestContainer } from "dioc/testing"
import { cloneDeep } from "lodash-es"
import { describe, expect, it, vi } from "vitest"

import { getService } from "~/modules/dioc"
import { MQTTRequest$, setMQTTRequest } from "~/newstore/MQTTSession"
import { SSERequest$, setSSERequest } from "~/newstore/SSESession"
import { SIORequest$, setSIORequest } from "~/newstore/SocketIOSession"
import { WSRequest$, setWSRequest } from "~/newstore/WebSocketSession"
import {
  graphqlCollectionStore,
  restCollectionStore,
  setGraphqlCollections,
  setRESTCollections,
} from "~/newstore/collections"
import {
  addGlobalEnvVariable,
  environments$,
  globalEnv$,
  replaceEnvironments,
  selectedEnvironmentIndex$,
  setGlobalEnvVariables,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import {
  graphqlHistoryStore,
  restHistoryStore,
  setGraphqlHistoryEntries,
  setRESTHistoryEntries,
  translateToNewGQLHistory,
  translateToNewRESTHistory,
} from "~/newstore/history"
import { bulkApplyLocalState, localStateStore } from "~/newstore/localstate"
import {
  applySetting,
  bulkApplySettings,
  performSettingsDataMigrations,
  settingsStore,
} from "~/newstore/settings"
import { PersistenceService } from "../persistence.service"
import { GQLTabService } from "../tab/graphql"
import { RESTTabService } from "../tab/rest"
import {
  ENVIRONMENTS,
  GQL_COLLECTIONS,
  GQL_HISTORY,
  GQL_TAB_STATE,
  REST_COLLECTIONS,
  REST_HISTORY,
  REST_TAB_STATE,
  VUEX_DATA,
} from "./__mocks__/persistence.service.mocks"

// Define modules that are shared across methods here
vi.mock("@vueuse/core", async (importOriginal) => {
  const actualModule: Record<string, unknown> = await importOriginal()

  return {
    ...actualModule,
    watchDebounced: vi.fn(),
  }
})

vi.mock("~/newstore/environments", () => {
  return {
    // ...actualModule,
    addGlobalEnvVariable: vi.fn(),
    setGlobalEnvVariables: vi.fn(),
    replaceEnvironments: vi.fn(),
    setSelectedEnvironmentIndex: vi.fn(),
    environments$: {
      subscribe: vi.fn(),
    },
    globalEnv$: {
      subscribe: vi.fn(),
    },
    selectedEnvironmentIndex$: {
      subscribe: vi.fn(),
    },
  }
})

describe("PersistenceService", () => {
  describe("checkAndMigrateOldSettings", () => {
    it("sets the selected environment index type as `NO_ENV` in localStorage if the `selectedEnvIndex` retrieved is `-1`", () => {
      window.localStorage.setItem("selectedEnvIndex", "-1")

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setItemSpy).toHaveBeenCalledWith(
        "selectedEnvIndex",
        JSON.stringify({
          type: "NO_ENV_SELECTED",
        })
      )
    })

    it("sets the selected environment index type as `MY_ENV` in localStorage if the `selectedEnvIndex` retrieved is greater than `0`", () => {
      window.localStorage.setItem("selectedEnvIndex", "1")

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setItemSpy).toHaveBeenCalledWith(
        "selectedEnvIndex",
        JSON.stringify({
          type: "MY_ENV",
          index: 1,
        })
      )
    })

    it("extracts individual properties from the key `vuex` and sets them in localStorage", () => {
      vi.mock("~/newstore/settings", () => {
        return {
          applySetting: vi.fn(),
        }
      })

      const vuexData = cloneDeep(VUEX_DATA)

      window.localStorage.setItem("vuex", JSON.stringify(vuexData))

      const themeColor = "red"
      const nuxtColorMode = "dark"

      window.localStorage.setItem("THEME_COLOR", themeColor)
      window.localStorage.setItem("nuxt-color-mode", nuxtColorMode)

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem")
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("vuex")
      expect(setItemSpy).toHaveBeenCalledWith(
        "settings",
        JSON.stringify(vuexData.postwoman.settings)
      )

      const { postwoman } = vuexData
      delete postwoman.settings

      expect(setItemSpy).toHaveBeenCalledWith("vuex", JSON.stringify(vuexData))

      // Excluding `settings`
      expect(setItemSpy).toHaveBeenCalledWith(
        "collections",
        JSON.stringify(postwoman.collections)
      )

      delete postwoman.collections

      // Excluding `settings` & `collections`
      expect(setItemSpy).toHaveBeenCalledWith("vuex", JSON.stringify(vuexData))

      expect(setItemSpy).toHaveBeenCalledWith(
        "collectionsGraphql",
        JSON.stringify(postwoman.collectionsGraphql)
      )

      delete postwoman.collectionsGraphql

      // Excluding `settings, `collections` & `collectionsGraphql`
      expect(setItemSpy).toHaveBeenCalledWith("vuex", JSON.stringify(vuexData))

      expect(setItemSpy).toHaveBeenCalledWith(
        "environments",
        JSON.stringify(postwoman.environments)
      )

      delete postwoman.environments

      // Excluding `settings, `collections`, `collectionsGraphql` & `environments`
      expect(setItemSpy).toHaveBeenCalledWith("vuex", JSON.stringify(vuexData))

      expect(getItemSpy).toHaveBeenCalledWith("THEME_COLOR")
      expect(applySetting).toHaveBeenCalledWith("THEME_COLOR", themeColor)
      expect(removeItemSpy).toHaveBeenCalledWith("THEME_COLOR")
      expect(window.localStorage.getItem("THEME_COLOR")).toBe(null)

      expect(getItemSpy).toHaveBeenCalledWith("nuxt-color-mode")
      expect(applySetting).toHaveBeenCalledWith("BG_COLOR", nuxtColorMode)
      expect(removeItemSpy).toHaveBeenCalledWith("nuxt-color-mode")
      expect(window.localStorage.getItem("nuxt-color-mode")).toBe(null)
    })
  })

  it("`setupLocalStatePersistence` method reads the value for `localState` key from localStorage, invokes `bulkApplyLocalState` function if a value is yielded and subscribes to `localStateStore` updates", () => {
    vi.mock("~/newstore/localstate", () => {
      return {
        bulkApplyLocalState: vi.fn(),
        localStateStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
      }
    })

    const localState = {
      REMEMBERED_TEAM_ID: "test-id",
    }
    window.localStorage.setItem("localState", JSON.stringify(localState))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupLocalStatePersistence()

    expect(getItemSpy).toHaveBeenCalledWith("localState")
    expect(bulkApplyLocalState).toHaveBeenCalledWith(localState)
    expect(localStateStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it("`setupSettingsPersistence` reads the value for `settings` from localStorage, invokes `performSettingsDataMigrations` and `bulkApplySettings` functions as required and subscribes to `settingsStore` updates", () => {
    vi.mock("~/newstore/settings", async (importOriginal) => {
      const actualModule: Record<string, unknown> = await importOriginal()

      return {
        ...actualModule,
        applySetting: vi.fn(),
        bulkApplySettings: vi.fn(),
        performSettingsDataMigrations: vi
          .fn()
          .mockImplementation((data: any) => data),
        settingsStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
      }
    })

    const { settings } = VUEX_DATA.postwoman
    window.localStorage.setItem("settings", JSON.stringify(settings))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupSettingsPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("settings")

    expect(performSettingsDataMigrations).toHaveBeenCalledWith(settings)
    expect(bulkApplySettings).toHaveBeenCalledWith(settings)

    expect(settingsStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it("`setupHistoryPersistence` method reads REST and GQL history entries from localStorage, translates them to the new format, writes back the updates and subscribes to the respective store for updates", () => {
    vi.mock("~/newstore/history", () => {
      return {
        setGraphqlHistoryEntries: vi.fn(),
        setRESTHistoryEntries: vi.fn(),
        translateToNewGQLHistory: vi
          .fn()
          .mockImplementation((data: any) => data),
        translateToNewRESTHistory: vi
          .fn()
          .mockImplementation((data: any) => data),
        graphqlHistoryStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
        restHistoryStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
      }
    })

    const stringifiedRestHistory = JSON.stringify(REST_HISTORY)
    const stringifiedGqlHistory = JSON.stringify(GQL_HISTORY)

    window.localStorage.setItem("history", stringifiedRestHistory)
    window.localStorage.setItem("graphqlHistory", stringifiedGqlHistory)

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupHistoryPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("history")
    expect(getItemSpy).toHaveBeenCalledWith("graphqlHistory")

    expect(translateToNewRESTHistory).toHaveBeenCalled()
    expect(translateToNewGQLHistory).toHaveBeenCalled()

    // This ensures `updatedOn` field is treated as a `string`
    const parsedRestHistory = JSON.parse(stringifiedRestHistory)
    const parsedGqlHistory = JSON.parse(stringifiedGqlHistory)

    expect(setRESTHistoryEntries).toHaveBeenCalledWith(parsedRestHistory)
    expect(setGraphqlHistoryEntries).toHaveBeenCalledWith(parsedGqlHistory)

    expect(restHistoryStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
    expect(graphqlHistoryStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it("`setupCollectionsPersistence` method reads REST and GQL collection entries from localStorage, translates them to the new format, writes back the updates and subscribes to the respective store for updates", () => {
    vi.mock("@hoppscotch/data", async (importOriginal) => {
      const actualModule: Record<string, unknown> = await importOriginal()

      return {
        ...actualModule,
        translateToNewGQLCollection: vi
          .fn()
          .mockImplementation((data: any) => data),
        translateToNewRESTCollection: vi
          .fn()
          .mockImplementation((data: any) => data),
      }
    })

    vi.mock("~/newstore/collections", () => {
      return {
        setGraphqlCollections: vi.fn(),
        setRESTCollections: vi.fn(),
        graphqlCollectionStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
        restCollectionStore: {
          subject$: {
            subscribe: vi.fn(),
          },
        },
      }
    })

    const restCollections = REST_COLLECTIONS
    const gqlCollections = GQL_COLLECTIONS

    window.localStorage.setItem("collections", JSON.stringify(restCollections))

    window.localStorage.setItem(
      "collectionsGraphql",
      JSON.stringify(gqlCollections)
    )

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupCollectionsPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("collections")
    expect(getItemSpy).toHaveBeenCalledWith("collectionsGraphql")

    expect(translateToNewGQLCollection).toHaveBeenCalled()
    expect(translateToNewRESTCollection).toHaveBeenCalled()

    expect(setRESTCollections).toHaveBeenCalledWith(restCollections)
    expect(setGraphqlCollections).toHaveBeenCalledWith(gqlCollections)

    expect(graphqlCollectionStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
    expect(restCollectionStore.subject$.subscribe).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it("`setupEnvironmentsPersistence` method separates `globals` entries from `environments`, subscribes to the `environmentStore` and updates localStorage entries", () => {
    const environments = cloneDeep(ENVIRONMENTS)
    window.localStorage.setItem("environments", JSON.stringify(environments))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupEnvironmentsPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("environments")
    expect(addGlobalEnvVariable).toHaveBeenCalledWith(
      environments[0].variables[0]
    )

    // Removes `globals` from environments
    environments.splice(0, 1)

    expect(setItemSpy).toHaveBeenCalledWith(
      "environments",
      JSON.stringify(environments)
    )
    expect(replaceEnvironments).toBeCalledWith(environments)
    expect(environments$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  describe("setupSelectedEnvPersistence", () => {
    it("sets it to the store if there is a selected env index", () => {
      window.localStorage.setItem(
        "selectedEnvIndex",
        JSON.stringify({
          type: "MY_ENV",
          index: 1,
        })
      )

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith({
        type: "MY_ENV",
        index: 1,
      })
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it("sets it to null if there is no selected env index", () => {
      window.localStorage.removeItem("selectedEnvIndex")

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith({
        type: "MY_ENV",
        index: 1,
      })
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  it("`setupWebsocketPersistence` method reads the `WebsocketRequest` entry from localStorage, sets it as the new request, subscribes to the `WSSessionStore` and updates localStorage entries", () => {
    vi.mock("~/newstore/WebSocketSession", () => {
      return {
        setWSRequest: vi.fn(),
        WSRequest$: {
          subscribe: vi.fn(),
        },
      }
    })

    const wsRequest = {
      endpoint: "wss://echo-websocket.hoppscotch.io",
      protocols: [],
    }
    window.localStorage.setItem("WebsocketRequest", JSON.stringify(wsRequest))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupWebsocketPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("WebsocketRequest")
    expect(setWSRequest).toHaveBeenCalledWith(wsRequest)
    expect(WSRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it("`setupSocketIOPersistence` method reads the `SocketIORequest` entry from localStorage, sets it as the new request, subscribes to the `SIOSessionStore` and updates localStorage entries", () => {
    vi.mock("~/newstore/SocketIOSession", () => {
      return {
        setSIORequest: vi.fn(),
        SIORequest$: {
          subscribe: vi.fn(),
        },
      }
    })

    const sioRequest = {
      endpoint: "wss://echo-socketio.hoppscotch.io",
      path: "/socket.io",
      version: "v4",
    }

    window.localStorage.setItem("SocketIORequest", JSON.stringify(sioRequest))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupSocketIOPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("SocketIORequest")
    expect(setSIORequest).toHaveBeenCalledWith(sioRequest)
    expect(SIORequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it("`setupSSEPersistence` method reads the `SSERequest` entry from localStorage, sets it as the new request, subscribes to the `SSESessionStore` and updates localStorage entries", () => {
    vi.mock("~/newstore/SSESession", () => {
      return {
        setSSERequest: vi.fn(),
        SSERequest$: {
          subscribe: vi.fn(),
        },
      }
    })

    const sseRequest = {
      endpoint: "https://express-eventsource.herokuapp.com/events",
      eventType: "data",
    }
    window.localStorage.setItem("SSERequest", JSON.stringify(sseRequest))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupSSEPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("SSERequest")
    expect(setSSERequest).toHaveBeenCalledWith(sseRequest)
    expect(SSERequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it("`setupMQTTPersistence` method reads the `MQTTRequest` entry from localStorage, sets it as the new request, subscribes to the `MQTTSessionStore` and updates localStorage entries", () => {
    vi.mock("~/newstore/MQTTSession", () => {
      return {
        setMQTTRequest: vi.fn(),
        MQTTRequest$: {
          subscribe: vi.fn(),
        },
      }
    })

    const request = {
      endpoint: "wss://test.mosquitto.org:8081",
      clientID: "hoppscotch",
    }
    window.localStorage.setItem("MQTTRequest", JSON.stringify(request))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupMQTTPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("MQTTRequest")
    expect(setMQTTRequest).toHaveBeenCalledWith(request)
    expect(MQTTRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it("`setupGlobalEnvsPersistence` method reads the `globalEnv` entry from localStorage, dispatches the new value, subscribes to the `environmentsStore` and updates localStorage entries", () => {
    const globalEnv: Environment["variables"] = [
      { key: "testKey", value: "testValue" },
    ]
    window.localStorage.setItem("globalEnv", JSON.stringify(globalEnv))

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.setupGlobalEnvsPersistence()

    expect(getItemSpy).toHaveBeenCalledWith("globalEnv")
    expect(setGlobalEnvVariables).toHaveBeenCalledWith(globalEnv)
    expect(globalEnv$.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  describe("setupGQLTabsPersistence", () => {
    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = GQL_TAB_STATE
      window.localStorage.setItem("gqlTabState", JSON.stringify(tabState))

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const persistenceService = container.bind(PersistenceService)

      // TODO: Bind this to the `TestContainer`
      const gqlTabService = getService(GQLTabService)

      gqlTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Testing private method
      persistenceService.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")
      expect(gqlTabService.loadTabsFromPersistedState).toHaveBeenCalledWith(
        tabState
      )

      expect(watchDebounced).toHaveBeenCalledWith(
        gqlTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })

    it("logs an error to the console on failing to parse persisted tab state", () => {
      window.localStorage.setItem("gqlTabState", "invalid-json")

      console.error = vi.fn()
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const persistenceService = container.bind(PersistenceService)

      // TODO: Bind this to the `TestContainer`
      const gqlTabService = getService(GQLTabService)

      // @ts-expect-error Testing private method
      persistenceService.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")
      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem("gqlTabState")
      )

      expect(watchDebounced).toHaveBeenCalledWith(
        gqlTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })
  })

  describe("setupRESTTabsPersistence", () => {
    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = REST_TAB_STATE
      window.localStorage.setItem("restTabState", JSON.stringify(tabState))

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const persistenceService = container.bind(PersistenceService)

      // TODO: Bind this to the `TestContainer`
      const restTabService = getService(RESTTabService)

      restTabService.loadTabsFromPersistedState = vi.fn()

      persistenceService.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")
      expect(restTabService.loadTabsFromPersistedState).toHaveBeenCalledWith(
        tabState
      )

      expect(watchDebounced).toHaveBeenCalledWith(
        restTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })

    it("logs an error to the console on failing to parse persisted tab state", () => {
      window.localStorage.setItem("restTabState", "invalid-json")

      console.error = vi.fn()
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

      const container = new TestContainer()
      const persistenceService = container.bind(PersistenceService)

      // TODO: Bind this to the `TestContainer`
      const restTabService = getService(RESTTabService)

      persistenceService.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")
      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem("restTabState")
      )

      expect(watchDebounced).toHaveBeenCalledWith(
        restTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })
  })

  it("setupLocalPersistence", () => {
    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    // @ts-expect-error Testing private method
    service.checkAndMigrateOldSettings = vi.fn()

    // @ts-expect-error Testing private method
    service.setupLocalStatePersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupSettingsPersistence = vi.fn()

    service.setupRESTTabsPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupGQLTabsPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupHistoryPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupCollectionsPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupGlobalEnvsPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupEnvironmentsPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupSelectedEnvPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupWebsocketPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupSocketIOPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupSSEPersistence = vi.fn()

    // @ts-expect-error Testing private method
    service.setupMQTTPersistence = vi.fn()

    service.setupLocalPersistence()

    // @ts-expect-error Testing private method
    expect(service.checkAndMigrateOldSettings).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupLocalStatePersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupSettingsPersistence).toHaveBeenCalled()
    expect(service.setupRESTTabsPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupGQLTabsPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupHistoryPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupCollectionsPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupGlobalEnvsPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupEnvironmentsPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupSelectedEnvPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupWebsocketPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupSocketIOPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupSSEPersistence).toHaveBeenCalled()

    // @ts-expect-error Testing private method
    expect(service.setupMQTTPersistence).toHaveBeenCalled()
  })

  it("`setLocalConfig` method sets a value in localStorage", () => {
    const testKey = "test-key"
    const testValue = "test-value"

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    service.setLocalConfig(testKey, testValue)
    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
  })

  it("`getLocalConfig` method gets a value from localStorage", () => {
    const testKey = "test-key"
    const testValue = "test-value"

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    service.setLocalConfig(testKey, testValue)
    const retrievedValue = service.getLocalConfig(testKey)

    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
    expect(getItemSpy).toHaveBeenCalledWith(testKey)
    expect(retrievedValue).toBe(testValue)
  })

  it("`removeLocalConfig` method clears a value in localStorage", () => {
    const testKey = "test-key"
    const testValue = "test-value"

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem")

    const container = new TestContainer()
    const service = container.bind(PersistenceService)

    service.setLocalConfig(testKey, testValue)
    service.removeLocalConfig(testKey)
    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
    expect(removeItemSpy).toHaveBeenCalledWith(testKey)
  })
})
