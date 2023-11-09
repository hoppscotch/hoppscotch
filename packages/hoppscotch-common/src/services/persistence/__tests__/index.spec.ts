/* eslint-disable no-restricted-globals, no-restricted-syntax */

import {
  Environment,
  translateToNewGQLCollection,
  translateToNewRESTCollection,
} from "@hoppscotch/data"
import { watchDebounced } from "@vueuse/core"
import { TestContainer } from "dioc/testing"
import { cloneDeep } from "lodash-es"
import { afterAll, describe, expect, it, vi } from "vitest"

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
import { PersistenceService } from "../../persistence"
import {
  ENVIRONMENTS,
  GQL_COLLECTIONS,
  GQL_HISTORY,
  GQL_TAB_STATE,
  REST_COLLECTIONS,
  REST_HISTORY,
  REST_TAB_STATE,
  VUEX_DATA,
} from "./__mocks__"

vi.mock("~/modules/i18n", () => {
  return {
    __esModule: true,
    getI18n: vi.fn().mockImplementation(() => () => "test"),
  }
})

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

/**
 * Helper functions
 */
const spyOnGetItem = () => vi.spyOn(Storage.prototype, "getItem")
const spyOnRemoveItem = () => vi.spyOn(Storage.prototype, "removeItem")
const spyOnSetItem = () => vi.spyOn(Storage.prototype, "setItem")

const getServiceInstance = () => {
  const container = new TestContainer()
  const service = container.bind(PersistenceService)
  return service
}

describe("PersistenceService", () => {
  afterAll(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Restore the original implementation for any spied functions
    vi.restoreAllMocks()
  })

  describe("checkAndMigrateOldSettings", () => {
    vi.mock("~/newstore/settings", () => {
      return {
        applySetting: vi.fn(),
      }
    })

    it("sets the selected environment index type as `NO_ENV` in localStorage if the `selectedEnvIndex` retrieved is `-1`", () => {
      window.localStorage.setItem("selectedEnvIndex", "-1")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

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

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

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

    it.skip("shows an error and sets the entry as a backup in localStorage if `vuex` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `vuex`
      // `postwoman.settings.CURRENT_INTERCEPTOR_ID` -> `string`
      const vuexData = {
        ...VUEX_DATA,
        postwoman: {
          ...VUEX_DATA.postwoman,
          settings: {
            ...VUEX_DATA.postwoman.settings,
            CURRENT_INTERCEPTOR_ID: 1234,
          },
        },
      }

      window.localStorage.setItem("vuex", JSON.stringify(vuexData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("vuex")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.vuex_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "vuex-backup",
        JSON.stringify(vuexData)
      )
    })

    it("skips schema parsing and setting other properties if vuex read from localStorage is an empty entity", () => {
      window.localStorage.setItem("vuex", JSON.stringify({}))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("vuex")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("shows an error and sets the entry as a backup in localStorage if `THEME_COLOR` read from localStorage doesn't match the schema", () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem("vuex", JSON.stringify(vuexData))

      const invalidColor = "invalid-color"
      window.localStorage.setItem("THEME_COLOR", invalidColor)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("vuex")

      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.theme_color_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "THEME_COLOR-backup",
        invalidColor
      )

      expect(applySetting).toHaveBeenCalledWith("THEME_COLOR", invalidColor)
      expect(removeItemSpy).toHaveBeenCalledWith("THEME_COLOR")
    })

    it("shows an error and sets the entry as a backup in localStorage if `nuxt-color-mode` read from localStorage doesn't match the schema", () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem("vuex", JSON.stringify(vuexData))

      const invalidColor = "invalid-color"
      window.localStorage.setItem("nuxt-color-mode", invalidColor)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith("vuex")

      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.nuxt_color_mode_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "nuxt-color-mode-backup",
        invalidColor
      )

      expect(applySetting).toHaveBeenCalledWith("BG_COLOR", invalidColor)
      expect(removeItemSpy).toHaveBeenCalledWith("nuxt-color-mode")
    })

    it("extracts individual properties from the key `vuex` and sets them in localStorage", () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem("vuex", JSON.stringify(vuexData))

      const themeColor = "red"
      const nuxtColorMode = "dark"

      window.localStorage.setItem("THEME_COLOR", themeColor)
      window.localStorage.setItem("nuxt-color-mode", nuxtColorMode)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

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

  describe("setupLocalStatePersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `localState` read from localStorage has a value which is not a `string` or `undefined`", () => {
      const localState = {
        REMEMBERED_TEAM_ID: null,
      }
      window.localStorage.setItem("localState", JSON.stringify(localState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith("localState")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.local_state_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "localState-backup",
        JSON.stringify(localState)
      )
    })

    it("shows an error and sets the entry as a backup in localStorage if `localState` read from localStorage has an invalid key", () => {
      const localState = {
        INVALID_KEY: null,
      }
      window.localStorage.setItem("localState", JSON.stringify(localState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith("localState")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.local_state_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "localState-backup",
        JSON.stringify(localState)
      )
    })

    it("schema parsing succeeds if there is no `localState` key present in localStorage where the fallback of `{}` is chosen", () => {
      window.localStorage.removeItem("localState")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith("localState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the value for `localState` key from localStorage, invokes `bulkApplyLocalState` function if a value is yielded and subscribes to `localStateStore` updates", () => {
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

      const getItemSpy = spyOnGetItem()

      const service = getServiceInstance()

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith("localState")
      expect(bulkApplyLocalState).toHaveBeenCalledWith(localState)
      expect(localStateStore.subject$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupSettingsPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `settings` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `settings`
      // Expected value are booleans
      const settings = {
        EXTENSIONS_ENABLED: "true",
        PROXY_ENABLED: "true",
      }
      window.localStorage.setItem("settings", JSON.stringify(settings))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("settings")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.settings_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "settings-backup",
        JSON.stringify(settings)
      )
    })

    it("schema parsing succeeds if there is no `settings` key present in localStorage where the fallback of `{}` is chosen", () => {
      window.localStorage.removeItem("settings")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("settings")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the value for `settings` from localStorage, invokes `performSettingsDataMigrations` and `bulkApplySettings` functions as required and subscribes to `settingsStore` updates", () => {
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

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("settings")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(performSettingsDataMigrations).toHaveBeenCalledWith(settings)
      expect(bulkApplySettings).toHaveBeenCalledWith(settings)

      expect(settingsStore.subject$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupHistoryPersistence", () => {
    it.skip("shows an error and sets the entry as a backup in localStorage if `history` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `history`
      // `v` -> `number`
      const restHistoryData = { ...REST_HISTORY, v: "1" }
      window.localStorage.setItem("history", JSON.stringify(restHistoryData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("history")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.rest_history_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "history-backup",
        JSON.stringify(restHistoryData)
      )
    })

    it("REST history schema parsing succeeds if there is no `history` key present in localStorage where the fallback of `[]` is chosen", () => {
      window.localStorage.removeItem("history")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("history")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it.skip("shows an error and sets the entry as a backup in localStorage if `graphqlHistory` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `graphqlHistory`
      // `v` -> `number`
      const graphqlHistoryData = { ...GQL_HISTORY, v: "1" }
      window.localStorage.setItem(
        "graphqlHistory",
        JSON.stringify(graphqlHistoryData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("graphqlHistory")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.graphql_history_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "graphqlHistory-backup",
        JSON.stringify(graphqlHistoryData)
      )
    })

    it("GQL history schema parsing succeeds if there is no `graphqlHistory` key present in localStorage where the fallback of `[]` is chosen", () => {
      window.localStorage.removeItem("graphqlHistory")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("graphqlHistory")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads REST and GQL history entries from localStorage, translates them to the new format, writes back the updates and subscribes to the respective store for updates", () => {
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

      const getItemSpy = spyOnGetItem()

      const service = getServiceInstance()

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
  })

  describe("", () => {
    it.skip("shows an error and sets the entry as a backup in localStorage if `collections` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `collections`
      // `v` -> `number`
      const restCollectionsData = { ...REST_COLLECTIONS, v: "1" }
      window.localStorage.setItem(
        "collections",
        JSON.stringify(restCollectionsData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("collections")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.rest_collections_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "collections-backup",
        JSON.stringify(restCollectionsData)
      )
    })

    it("REST collections schema parsing succeeds if there is no `collections` key present in localStorage where the fallback of `[]` is chosen", () => {
      window.localStorage.removeItem("collections")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("collections")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it.skip("shows an error and sets the entry as a backup in localStorage if `collectionsGraphql` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `collectionsGraphql`
      // `v` -> `number`
      const graphqlCollectionsData = { ...GQL_COLLECTIONS, v: "1" }
      window.localStorage.setItem(
        "collectionsGraphql",
        JSON.stringify(graphqlCollectionsData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("collectionsGraphql")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.graphql_collections_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "collectionsGraphql-backup",
        JSON.stringify(graphqlCollectionsData)
      )
    })

    it("GQL history schema parsing succeeds if there is no `collectionsGraphql` key present in localStorage where the fallback of `[]` is chosen", () => {
      window.localStorage.removeItem("collectionsGraphql")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("collectionsGraphql")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads REST and GQL collection entries from localStorage, translates them to the new format, writes back the updates and subscribes to the respective store for updates", () => {
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

      window.localStorage.setItem(
        "collections",
        JSON.stringify(restCollections)
      )

      window.localStorage.setItem(
        "collectionsGraphql",
        JSON.stringify(gqlCollections)
      )

      const getItemSpy = spyOnGetItem()

      const service = getServiceInstance()

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
  })

  describe("setupEnvironmentsPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `environments` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `environments`
      const environments = [
        // `entries` -> `variables`
        { name: "Test", entries: [{ key: "test-key", value: "test-value" }] },
      ]

      window.localStorage.setItem("environments", JSON.stringify(environments))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupEnvironmentsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("environments")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.environments_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "environments-backup",
        JSON.stringify(environments)
      )
    })

    it("separates `globals` entries from `environments`, subscribes to the `environmentStore` and updates localStorage entries", () => {
      const environments = cloneDeep(ENVIRONMENTS)
      window.localStorage.setItem("environments", JSON.stringify(environments))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupEnvironmentsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("environments")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalledWith("environments-backup")

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
  })

  describe("setupSelectedEnvPersistence", () => {
    it.skip("shows an error and sets the entry as a backup in localStorage if `selectedEnvIndex` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `selectedEnvIndex`
      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        // `protocols` -> `[]`
        protocols: {},
      }

      window.localStorage.setItem("selectedEnvIndex", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.selected_env_index_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "selectedEnvIndex-backup",
        JSON.stringify(request)
      )
    })

    it("schema parsing succeeds if there is no `selectedEnvIndex` key present in localStorage where the fallback of `null` is chosen", () => {
      window.localStorage.removeItem("selectedEnvIndex")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("sets it to the store if there is a value associated with the `selectedEnvIndex` key in localStorage", () => {
      const selectedEnvIndex = {
        type: "MY_ENV",
        index: 1,
      }

      window.localStorage.setItem(
        "selectedEnvIndex",
        JSON.stringify(selectedEnvIndex)
      )

      const getItemSpy = spyOnGetItem()

      const service = getServiceInstance()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith(selectedEnvIndex)
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it("sets it to `NO_ENV_SELECTED` if there is no value associated with the `selectedEnvIndex` in localStorage", () => {
      window.localStorage.removeItem("selectedEnvIndex")

      const getItemSpy = spyOnGetItem()

      const service = getServiceInstance()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("selectedEnvIndex")
      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith({
        type: "NO_ENV_SELECTED",
      })
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupWebsocketPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `WebsocketRequest` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `WebsocketRequest`
      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        // `protocols` -> `[]`
        protocols: {},
      }

      window.localStorage.setItem("WebsocketRequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("WebsocketRequest")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.websocket_request_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "WebsocketRequest-backup",
        JSON.stringify(request)
      )
    })

    it("schema parsing succeeds if there is no `WebsocketRequest` key present in localStorage where the fallback of `null` is chosen", () => {
      window.localStorage.removeItem("WebsocketRequest")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("WebsocketRequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the `WebsocketRequest` entry from localStorage, sets it as the new request, subscribes to the `WSSessionStore` and updates localStorage entries", () => {
      vi.mock("~/newstore/WebSocketSession", () => {
        return {
          setWSRequest: vi.fn(),
          WSRequest$: {
            subscribe: vi.fn(),
          },
        }
      })

      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        protocols: [],
      }
      window.localStorage.setItem("WebsocketRequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("WebsocketRequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setWSRequest).toHaveBeenCalledWith(request)
      expect(WSRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupSocketIOPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `SocketIORequest` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `SocketIORequest`
      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        path: "/socket.io",
        // `v` -> `version: v4`
        v: "4",
      }

      window.localStorage.setItem("SocketIORequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SocketIORequest")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.socket_io_request_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "SocketIORequest-backup",
        JSON.stringify(request)
      )
    })

    it("schema parsing succeeds if there is no `SocketIORequest` key present in localStorage where the fallback of `null` is chosen", () => {
      window.localStorage.removeItem("SocketIORequest")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SocketIORequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the `SocketIORequest` entry from localStorage, sets it as the new request, subscribes to the `SIOSessionStore` and updates localStorage entries", () => {
      vi.mock("~/newstore/SocketIOSession", () => {
        return {
          setSIORequest: vi.fn(),
          SIORequest$: {
            subscribe: vi.fn(),
          },
        }
      })

      const request = {
        endpoint: "wss://echo-socketio.hoppscotch.io",
        path: "/socket.io",
        version: "v4",
      }

      window.localStorage.setItem("SocketIORequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SocketIORequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSIORequest).toHaveBeenCalledWith(request)
      expect(SIORequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupSSEPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `SSERequest` read from localStorage doesn't match the versioned schema", () => {
      // Invalid shape for `SSERequest`
      const request = {
        // `url` -> `endpoint`
        url: "https://express-eventsource.herokuapp.com/events",
        eventType: "data",
      }

      window.localStorage.setItem("SSERequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SSERequest")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.sse_request_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "SSERequest-backup",
        JSON.stringify(request)
      )
    })

    it("schema parsing succeeds if there is no `SSERequest` key present in localStorage where the fallback of `null` is chosen", () => {
      window.localStorage.removeItem("SSERequest")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SSERequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the `SSERequest` entry from localStorage, sets it as the new request, subscribes to the `SSESessionStore` and updates localStorage entries", () => {
      vi.mock("~/newstore/SSESession", () => {
        return {
          setSSERequest: vi.fn(),
          SSERequest$: {
            subscribe: vi.fn(),
          },
        }
      })

      const request = {
        endpoint: "https://express-eventsource.herokuapp.com/events",
        eventType: "data",
      }
      window.localStorage.setItem("SSERequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("SSERequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSSERequest).toHaveBeenCalledWith(request)
      expect(SSERequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupMQTTPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `MQTTRequest` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `MQTTRequest`
      const request = {
        // `url` -> `endpoint`
        url: "wss://test.mosquitto.org:8081",
        clientID: "hoppscotch",
      }

      window.localStorage.setItem("MQTTRequest", JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("MQTTRequest")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.mqtt_request_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "MQTTRequest-backup",
        JSON.stringify(request)
      )
    })

    it("schema parsing succeeds if there is no `MQTTRequest` key present in localStorage where the fallback of `null` is chosen", () => {
      window.localStorage.removeItem("MQTTRequest")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("MQTTRequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the `MQTTRequest` entry from localStorage, sets it as the new request, subscribes to the `MQTTSessionStore` and updates localStorage entries", () => {
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

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("MQTTRequest")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setMQTTRequest).toHaveBeenCalledWith(request)
      expect(MQTTRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupGlobalEnvsPersistence", () => {
    it("shows an error and sets the entry as a backup in localStorage if `globalEnv` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `globalEnv`
      const globalEnv = [
        {
          // `key` -> `string`
          key: 1,
          value: "testValue",
        },
      ]

      window.localStorage.setItem("globalEnv", JSON.stringify(globalEnv))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("globalEnv")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.global_env_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "globalEnv-backup",
        JSON.stringify(globalEnv)
      )
    })

    it("schema parsing succeeds if there is no `globalEnv` key present in localStorage where the fallback of `[]` is chosen", () => {
      window.localStorage.removeItem("globalEnv")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("globalEnv")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it("reads the `globalEnv` entry from localStorage, dispatches the new value, subscribes to the `environmentsStore` and updates localStorage entries", () => {
      const globalEnv: Environment["variables"] = [
        { key: "testKey", value: "testValue" },
      ]
      window.localStorage.setItem("globalEnv", JSON.stringify(globalEnv))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("globalEnv")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setGlobalEnvVariables).toHaveBeenCalledWith(globalEnv)
      expect(globalEnv$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupGQLTabsPersistence", () => {
    it.skip("shows an error and sets the entry as a backup in localStorage if `gqlTabState` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `gqlTabState`
      // `lastActiveTabID` -> `string`
      const gqlTabState = { ...GQL_TAB_STATE, lastActiveTabID: 1234 }

      window.localStorage.setItem("gqlTabState", JSON.stringify(gqlTabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.global_env_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "gqlTabState-backup",
        JSON.stringify(gqlTabState)
      )
    })

    it("skips schema parsing and the loading of persisted tabs if there is no `gqlTabState` key present in localStorage", () => {
      window.localStorage.removeItem("gqlTabState")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.gqlTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(
        // @ts-expect-error Testing private member
        service.gqlTabService.loadTabsFromPersistedState
      ).not.toHaveBeenCalled()

      expect(watchDebounced).toHaveBeenCalled()
    })

    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = GQL_TAB_STATE
      window.localStorage.setItem("gqlTabState", JSON.stringify(tabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.gqlTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private member
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(
        // @ts-expect-error Testing private member
        service.gqlTabService.loadTabsFromPersistedState
      ).toHaveBeenCalledWith(tabState)
      expect(watchDebounced).toHaveBeenCalledWith(
        // @ts-expect-error Testing private member
        service.gqlTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })

    it("logs an error to the console on failing to parse persisted tab state", () => {
      window.localStorage.setItem("gqlTabState", "invalid-json")

      console.error = vi.fn()
      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("gqlTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem("gqlTabState")
      )
      expect(watchDebounced).toHaveBeenCalledWith(
        // @ts-expect-error Testing private member
        service.gqlTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })
  })

  describe("setupRESTTabsPersistence", () => {
    it.skip("shows an error and sets the entry as a backup in localStorage if `restTabState` read from localStorage doesn't match the schema", () => {
      // Invalid shape for `restTabState`
      // `lastActiveTabID` -> `string`
      const restTabState = { ...REST_TAB_STATE, lastActiveTabID: 1234 }

      window.localStorage.setItem("restTabState", JSON.stringify(restTabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")
      expect(i18nSpy).toHaveBeenCalledWith(
        "local_storage_read.rest_tab_schema_mismatch"
      )
      expect(setItemSpy).toHaveBeenCalledWith(
        "restTabState-backup",
        JSON.stringify(restTabState)
      )
    })

    it("skips schema parsing and the loading of persisted tabs if there is no `restTabState` key present in localStorage", () => {
      window.localStorage.removeItem("restTabState")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.restTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(
        // @ts-expect-error Testing private member
        service.restTabService.loadTabsFromPersistedState
      ).not.toHaveBeenCalled()

      expect(watchDebounced).toHaveBeenCalled()
    })

    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = REST_TAB_STATE
      window.localStorage.setItem("restTabState", JSON.stringify(tabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      // @ts-expect-error Spying on private member
      service.restTabService.loadTabsFromPersistedState = vi.fn()

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(
        // @ts-expect-error Testing private member
        service.restTabService.loadTabsFromPersistedState
      ).toHaveBeenCalledWith(tabState)
      expect(watchDebounced).toHaveBeenCalledWith(
        // @ts-expect-error Testing private member
        service.restTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })

    it("logs an error to the console on failing to parse persisted tab state", () => {
      window.localStorage.setItem("restTabState", "invalid-json")

      console.error = vi.fn()
      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const i18nSpy = vi.spyOn(service, "t")

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith("restTabState")

      expect(i18nSpy).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem("restTabState")
      )
      expect(watchDebounced).toHaveBeenCalledWith(
        // @ts-expect-error Testing private member
        service.restTabService.persistableTabState,
        expect.any(Function),
        { debounce: 500, deep: true }
      )
    })
  })

  it("`setupLocalPersistence` method sets up entries in localStorage by invoking other methods as necessary", () => {
    const service = getServiceInstance()

    // @ts-expect-error Spying on private method
    service.checkAndMigrateOldSettings = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupLocalStatePersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupSettingsPersistence = vi.fn()

    service.setupRESTTabsPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupGQLTabsPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupHistoryPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupCollectionsPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupGlobalEnvsPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupEnvironmentsPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupSelectedEnvPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupWebsocketPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupSocketIOPersistence = vi.fn()

    // @ts-expect-error Spying on private method
    service.setupSSEPersistence = vi.fn()

    // @ts-expect-error Spying on private method
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

    const setItemSpy = spyOnSetItem()

    const service = getServiceInstance()

    service.setLocalConfig(testKey, testValue)
    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
  })

  it("`getLocalConfig` method gets a value from localStorage", () => {
    const testKey = "test-key"
    const testValue = "test-value"

    const setItemSpy = spyOnSetItem()
    const getItemSpy = spyOnGetItem()

    const service = getServiceInstance()

    service.setLocalConfig(testKey, testValue)
    const retrievedValue = service.getLocalConfig(testKey)

    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
    expect(getItemSpy).toHaveBeenCalledWith(testKey)
    expect(retrievedValue).toBe(testValue)
  })

  it("`removeLocalConfig` method clears a value in localStorage", () => {
    const testKey = "test-key"
    const testValue = "test-value"

    const setItemSpy = spyOnSetItem()
    const removeItemSpy = spyOnRemoveItem()

    const service = getServiceInstance()

    service.setLocalConfig(testKey, testValue)
    service.removeLocalConfig(testKey)

    expect(setItemSpy).toHaveBeenCalledWith(testKey, testValue)
    expect(removeItemSpy).toHaveBeenCalledWith(testKey)
  })
})
