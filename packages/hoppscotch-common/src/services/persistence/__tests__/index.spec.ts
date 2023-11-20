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

import { useToast } from "~/composables/toast"
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

describe.skip("PersistenceService", () => {
  afterAll(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Restore the original implementation for any spied functions
    vi.restoreAllMocks()
  })

  it.skip("`showErrorToast` method shows an error toast with the supplied key", () => {
    vi.mock("~/composables/toast", () => {
      return {
        useToast: () => {
          return {
            error: vi.fn(),
          }
        },
      }
    })

    const testKey = "testKey"
    const toast = useToast()
    const service = getServiceInstance()

    // @ts-expect-error Testing private method
    service.showErrorToast(testKey)

    expect(toast.error).toHaveBeenCalledWith(
      `There's a mismatch with the expected schema for the value corresponding to ${testKey} read from localStorage, keeping a backup in ${testKey}-backup`
    )
  })

  describe("checkAndMigrateOldSettings", () => {
    vi.mock("~/newstore/settings", () => {
      return {
        applySetting: vi.fn(),
      }
    })

    // Set of keys read from localStorage across test cases
    const bgColorKey = "BG_COLOR"
    const nuxtColorModeKey = "nuxt-color-mode"
    const selectedEnvIndexKey = "selectedEnvIndex"
    const themeColorKey = "THEME_COLOR"
    const vuexKey = "vuex"

    it(`sets the selected environment index type as "NO_ENV" in localStorage if the value retrieved for ${selectedEnvIndexKey} is "-1"`, () => {
      window.localStorage.setItem(selectedEnvIndexKey, "-1")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        selectedEnvIndexKey,
        JSON.stringify({
          type: "NO_ENV_SELECTED",
        })
      )
    })

    it(`sets the selected environment index type as "MY_ENV" in localStorage if the value retrieved for "${selectedEnvIndexKey}" is greater than "0"`, () => {
      window.localStorage.setItem(selectedEnvIndexKey, "1")

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const container = new TestContainer()
      const service = container.bind(PersistenceService)

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        selectedEnvIndexKey,
        JSON.stringify({
          type: "MY_ENV",
          index: 1,
        })
      )
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${vuexKey}" read from localStorage doesn't match the schema`, () => {
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

      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      const showErrortoast = vi.spyOn(service, "showErrorToast")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(vuexKey)
      expect(showErrortoast).toHaveBeenCalledWith(vuexKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${vuexKey}-backup`,
        JSON.stringify(vuexData)
      )
    })

    it(`skips schema parsing and setting other properties if ${vuexKey} read from localStorage is an empty entity`, () => {
      window.localStorage.setItem(vuexKey, JSON.stringify({}))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      const showErrorToast = vi.spyOn(service, "showErrorToast")

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(vuexKey)

      expect(showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${themeColorKey}" read from localStorage doesn't match the schema`, () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))

      const themeColorValue = "invalid-color"
      window.localStorage.setItem(themeColorKey, themeColorValue)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(vuexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(themeColorKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${themeColorKey}-backup`,
        themeColorValue
      )

      expect(applySetting).toHaveBeenCalledWith(themeColorKey, themeColorValue)
      expect(removeItemSpy).toHaveBeenCalledWith(themeColorKey)
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${nuxtColorModeKey}" read from localStorage doesn't match the schema`, () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))

      const nuxtColorModeValue = "invalid-color"
      window.localStorage.setItem(nuxtColorModeKey, nuxtColorModeValue)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(vuexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(nuxtColorModeKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${nuxtColorModeKey}-backup`,
        nuxtColorModeValue
      )

      expect(applySetting).toHaveBeenCalledWith(bgColorKey, nuxtColorModeValue)
      expect(removeItemSpy).toHaveBeenCalledWith(nuxtColorModeKey)
    })

    it(`extracts individual properties from the key "${vuexKey}" and sets them in localStorage`, () => {
      const vuexData = cloneDeep(VUEX_DATA)
      window.localStorage.setItem(vuexKey, JSON.stringify(vuexData))

      const themeColor = "red"
      const nuxtColorMode = "dark"

      window.localStorage.setItem(themeColorKey, themeColor)
      window.localStorage.setItem(nuxtColorModeKey, nuxtColorMode)

      const getItemSpy = spyOnGetItem()
      const removeItemSpy = spyOnRemoveItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.checkAndMigrateOldSettings()

      expect(getItemSpy).toHaveBeenCalledWith(vuexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalledWith(nuxtColorModeKey)
      expect(setItemSpy).not.toHaveBeenCalledWith(`${nuxtColorModeKey}-backup`)

      expect(setItemSpy).toHaveBeenCalledWith(
        "settings",
        JSON.stringify(vuexData.postwoman.settings)
      )

      const { postwoman } = vuexData
      delete postwoman.settings

      expect(setItemSpy).toHaveBeenCalledWith(vuexKey, JSON.stringify(vuexData))

      // Excluding `settings`
      expect(setItemSpy).toHaveBeenCalledWith(
        "collections",
        JSON.stringify(postwoman.collections)
      )

      delete postwoman.collections

      // Excluding `settings` & `collections`
      expect(setItemSpy).toHaveBeenCalledWith(vuexKey, JSON.stringify(vuexData))

      expect(setItemSpy).toHaveBeenCalledWith(
        "collectionsGraphql",
        JSON.stringify(postwoman.collectionsGraphql)
      )

      delete postwoman.collectionsGraphql

      // Excluding `settings, `collections` & `collectionsGraphql`
      expect(setItemSpy).toHaveBeenCalledWith(vuexKey, JSON.stringify(vuexData))

      expect(setItemSpy).toHaveBeenCalledWith(
        "environments",
        JSON.stringify(postwoman.environments)
      )

      delete postwoman.environments

      // Excluding `settings, `collections`, `collectionsGraphql` & `environments`
      expect(setItemSpy).toHaveBeenCalledWith(vuexKey, JSON.stringify(vuexData))

      expect(getItemSpy).toHaveBeenCalledWith(themeColorKey)
      expect(applySetting).toHaveBeenCalledWith(themeColorKey, themeColor)
      expect(removeItemSpy).toHaveBeenCalledWith(themeColorKey)
      expect(window.localStorage.getItem(themeColorKey)).toBe(null)

      expect(getItemSpy).toHaveBeenCalledWith(nuxtColorModeKey)
      expect(applySetting).toHaveBeenCalledWith(bgColorKey, nuxtColorMode)
      expect(removeItemSpy).toHaveBeenCalledWith(nuxtColorModeKey)
      expect(window.localStorage.getItem(nuxtColorModeKey)).toBe(null)
    })
  })

  describe("setupLocalStatePersistence", () => {
    // Key read from localStorage across test cases
    const localStateKey = "localState"

    it(`shows an error and sets the entry as a backup in localStorage if "${localStateKey}" read from localStorage has a value which is not a "string" or "undefined"`, () => {
      const localStateData = {
        REMEMBERED_TEAM_ID: null,
      }
      window.localStorage.setItem(localStateKey, JSON.stringify(localStateData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith(localStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(localStateKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${localStateKey}-backup`,
        JSON.stringify(localStateData)
      )
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${localStateKey}" read from localStorage has an invalid key`, () => {
      const localStateData = {
        INVALID_KEY: null,
      }
      window.localStorage.setItem(localStateKey, JSON.stringify(localStateData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith(localStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(localStateKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${localStateKey}-backup`,
        JSON.stringify(localStateData)
      )
    })

    it(`schema parsing succeeds if there is no "${localStateKey}" key present in localStorage where the fallback of "{}" is chosen`, () => {
      window.localStorage.removeItem(localStateKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith(localStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the value for "${localStateKey}" key from localStorage, invokes "bulkApplyLocalState" function if a value is yielded and subscribes to "localStateStore" updates`, () => {
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

      const localStateData = {
        REMEMBERED_TEAM_ID: "test-id",
      }
      window.localStorage.setItem(localStateKey, JSON.stringify(localStateData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupLocalStatePersistence()

      expect(getItemSpy).toHaveBeenCalledWith(localStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(bulkApplyLocalState).toHaveBeenCalledWith(localStateData)
      expect(localStateStore.subject$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupSettingsPersistence", () => {
    // Key read from localStorage across test cases
    const settingsKey = "settings"

    it(`shows an error and sets the entry as a backup in localStorage if "${settingsKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `settings`
      // Expected value are booleans
      const settings = {
        EXTENSIONS_ENABLED: "true",
        PROXY_ENABLED: "true",
      }
      window.localStorage.setItem(settingsKey, JSON.stringify(settings))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(settingsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(settingsKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${settingsKey}-backup`,
        JSON.stringify(settings)
      )
    })

    it(`schema parsing succeeds if there is no "${settingsKey}" key present in localStorage where the fallback of "{}" is chosen`, () => {
      window.localStorage.removeItem(settingsKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(settingsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the value for "${settingsKey}" from localStorage, invokes "performSettingsDataMigrations" and "bulkApplySettings" functions as required and subscribes to "settingsStore" updates`, () => {
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
      window.localStorage.setItem(settingsKey, JSON.stringify(settings))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSettingsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(settingsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(performSettingsDataMigrations).toHaveBeenCalledWith(settings)
      expect(bulkApplySettings).toHaveBeenCalledWith(settings)

      expect(settingsStore.subject$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupHistoryPersistence", () => {
    // Keys read from localStorage across test cases
    const historyKey = "history"
    const graphqlHistoryKey = "graphqlHistory"

    it(`shows an error and sets the entry as a backup in localStorage if "${historyKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `history`
      // `v` -> `number`
      const restHistoryData = [{ ...REST_HISTORY, v: "1" }]
      window.localStorage.setItem(historyKey, JSON.stringify(restHistoryData))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(historyKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(historyKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${historyKey}-backup`,
        JSON.stringify(restHistoryData)
      )
    })

    it(`REST history schema parsing succeeds if there is no "${historyKey}" key present in localStorage where the fallback of "[]" is chosen`, () => {
      window.localStorage.removeItem(historyKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(historyKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${graphqlHistoryKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `graphqlHistory`
      // `v` -> `number`
      const graphqlHistoryData = [{ ...GQL_HISTORY, v: "1" }]
      window.localStorage.setItem(
        graphqlHistoryKey,
        JSON.stringify(graphqlHistoryData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(graphqlHistoryKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).to.toHaveBeenCalledWith(graphqlHistoryKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${graphqlHistoryKey}-backup`,
        JSON.stringify(graphqlHistoryData)
      )
    })

    it(`GQL history schema parsing succeeds if there is no "${graphqlHistoryKey}" key present in localStorage where the fallback of "[]" is chosen`, () => {
      window.localStorage.removeItem(graphqlHistoryKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(graphqlHistoryKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.to.toHaveBeenCalled()
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

      window.localStorage.setItem(historyKey, stringifiedRestHistory)
      window.localStorage.setItem(graphqlHistoryKey, stringifiedGqlHistory)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupHistoryPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(historyKey)
      expect(getItemSpy).toHaveBeenCalledWith(graphqlHistoryKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.to.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

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

  describe("setupCollectionsPersistence", () => {
    // Keys read from localStorage across test cases
    const collectionsKey = "collections"
    const collectionsGraphqlKey = "collectionsGraphql"

    it(`shows an error and sets the entry as a backup in localStorage if "${collectionsKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `collections`
      // `v` -> `number`
      const restCollectionsData = [{ ...REST_COLLECTIONS, v: "1" }]
      window.localStorage.setItem(
        collectionsKey,
        JSON.stringify(restCollectionsData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(collectionsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(collectionsKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${collectionsKey}-backup`,
        JSON.stringify(restCollectionsData)
      )
    })

    it(`REST collections schema parsing succeeds if there is no "${collectionsKey}" key present in localStorage where the fallback of "[]" is chosen`, () => {
      window.localStorage.removeItem(collectionsKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(collectionsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`shows an error and sets the entry as a backup in localStorage if "${collectionsGraphqlKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `collectionsGraphql`
      // `v` -> `number`
      const graphqlCollectionsData = [{ ...GQL_COLLECTIONS, v: "1" }]
      window.localStorage.setItem(
        collectionsGraphqlKey,
        JSON.stringify(graphqlCollectionsData)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(collectionsGraphqlKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(collectionsGraphqlKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${collectionsGraphqlKey}-backup`,
        JSON.stringify(graphqlCollectionsData)
      )
    })

    it(`GQL history schema parsing succeeds if there is no "${collectionsGraphqlKey}" key present in localStorage where the fallback of "[]" is chosen`, () => {
      window.localStorage.removeItem(collectionsGraphqlKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(collectionsGraphqlKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
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
        collectionsKey,
        JSON.stringify(restCollections)
      )

      window.localStorage.setItem(
        collectionsGraphqlKey,
        JSON.stringify(gqlCollections)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupCollectionsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(collectionsKey)
      expect(getItemSpy).toHaveBeenCalledWith(collectionsGraphqlKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

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
    // Key read from localStorage across test cases
    const environmentsKey = "environments"

    it(`shows an error and sets the entry as a backup in localStorage if "${environmentsKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `environments`
      const environments = [
        // `entries` -> `variables`
        { name: "Test", entries: [{ key: "test-key", value: "test-value" }] },
      ]

      window.localStorage.setItem(environmentsKey, JSON.stringify(environments))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupEnvironmentsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(environmentsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(environmentsKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${environmentsKey}-backup`,
        JSON.stringify(environments)
      )
    })

    it(`separates "globals" entries from "${environmentsKey}", subscribes to the "environmentStore" and updates localStorage entries`, () => {
      const environments = cloneDeep(ENVIRONMENTS)
      window.localStorage.setItem("environments", JSON.stringify(environments))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupEnvironmentsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(environmentsKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalledWith(`${environmentsKey}-backup`)

      expect(addGlobalEnvVariable).toHaveBeenCalledWith(
        environments[0].variables[0]
      )

      // Removes `globals` from environments
      environments.splice(0, 1)

      expect(setItemSpy).toHaveBeenCalledWith(
        environmentsKey,
        JSON.stringify(environments)
      )
      expect(replaceEnvironments).toBeCalledWith(environments)
      expect(environments$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupSelectedEnvPersistence", () => {
    // Key read from localStorage across test cases
    const selectedEnvIndexKey = "selectedEnvIndex"

    it(`shows an error and sets the entry as a backup in localStorage if "${selectedEnvIndexKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `selectedEnvIndex`
      // `index` -> `number`
      const selectedEnvIndex = {
        type: "MY_ENV",
        index: "1",
      }

      window.localStorage.setItem(
        selectedEnvIndexKey,
        JSON.stringify(selectedEnvIndex)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(selectedEnvIndexKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${selectedEnvIndexKey}-backup`,
        JSON.stringify(selectedEnvIndex)
      )
    })

    it(`schema parsing succeeds if there is no "${selectedEnvIndexKey}" key present in localStorage where the fallback of "null" is chosen`, () => {
      window.localStorage.removeItem(selectedEnvIndexKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`sets it to the store if there is a value associated with the "${selectedEnvIndexKey}" key in localStorage`, () => {
      const selectedEnvIndex = {
        type: "MY_ENV",
        index: 1,
      }

      window.localStorage.setItem(
        selectedEnvIndexKey,
        JSON.stringify(selectedEnvIndex)
      )

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith(selectedEnvIndex)
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it(`sets it to "NO_ENV_SELECTED" if there is no value associated with the "${selectedEnvIndexKey}" in localStorage`, () => {
      window.localStorage.removeItem(selectedEnvIndexKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSelectedEnvPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(selectedEnvIndexKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSelectedEnvironmentIndex).toHaveBeenCalledWith({
        type: "NO_ENV_SELECTED",
      })
      expect(selectedEnvironmentIndex$.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })
  })

  describe("setupWebsocketPersistence", () => {
    // Key read from localStorage across test cases
    const wsRequestKey = "WebsocketRequest"

    it(`shows an error and sets the entry as a backup in localStorage if "${wsRequestKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `WebsocketRequest`
      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        // `protocols` -> `[]`
        protocols: {},
      }

      window.localStorage.setItem(wsRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(wsRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(wsRequestKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${wsRequestKey}-backup`,
        JSON.stringify(request)
      )
    })

    it(`schema parsing succeeds if there is no "${wsRequestKey}" key present in localStorage where the fallback of "null" is chosen`, () => {
      window.localStorage.removeItem(wsRequestKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(wsRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the "${wsRequestKey}" entry from localStorage, sets it as the new request, subscribes to the "WSSessionStore" and updates localStorage entries`, () => {
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
      window.localStorage.setItem(wsRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupWebsocketPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(wsRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setWSRequest).toHaveBeenCalledWith(request)
      expect(WSRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupSocketIOPersistence", () => {
    // Key read from localStorage across test cases
    const sioRequestKey = "SocketIORequest"

    it(`shows an error and sets the entry as a backup in localStorage if "${sioRequestKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `SocketIORequest`
      const request = {
        endpoint: "wss://echo-websocket.hoppscotch.io",
        path: "/socket.io",
        // `v` -> `version: v4`
        v: "4",
      }

      window.localStorage.setItem(sioRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sioRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(sioRequestKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${sioRequestKey}-backup`,
        JSON.stringify(request)
      )
    })

    it(`schema parsing succeeds if there is no "${sioRequestKey}" key present in localStorage where the fallback of "null" is chosen`, () => {
      window.localStorage.removeItem(sioRequestKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sioRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the "${sioRequestKey}" entry from localStorage, sets it as the new request, subscribes to the "SIOSessionStore" and updates localStorage entries`, () => {
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

      window.localStorage.setItem(sioRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSocketIOPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sioRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSIORequest).toHaveBeenCalledWith(request)
      expect(SIORequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupSSEPersistence", () => {
    // Key read from localStorage across test cases
    const sseRequestKey = "SSERequest"

    it(`shows an error and sets the entry as a backup in localStorage if "${sseRequestKey}" read from localStorage doesn't match the versioned schema`, () => {
      // Invalid shape for `SSERequest`
      const request = {
        // `url` -> `endpoint`
        url: "https://express-eventsource.herokuapp.com/events",
        eventType: "data",
      }

      window.localStorage.setItem(sseRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sseRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(sseRequestKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${sseRequestKey}-backup`,
        JSON.stringify(request)
      )
    })

    it(`schema parsing succeeds if there is no "${sseRequestKey}" key present in localStorage where the fallback of "null" is chosen`, () => {
      window.localStorage.removeItem(sseRequestKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sseRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the "${sseRequestKey}" entry from localStorage, sets it as the new request, subscribes to the "SSESessionStore" and updates localStorage entries`, () => {
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
      window.localStorage.setItem(sseRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupSSEPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(sseRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setSSERequest).toHaveBeenCalledWith(request)
      expect(SSERequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupMQTTPersistence", () => {
    // Key read from localStorage across test cases
    const mqttRequestKey = "MQTTRequest"

    it(`shows an error and sets the entry as a backup in localStorage if "${mqttRequestKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `MQTTRequest`
      const request = {
        // `url` -> `endpoint`
        url: "wss://test.mosquitto.org:8081",
        clientID: "hoppscotch",
      }

      window.localStorage.setItem(mqttRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(mqttRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(mqttRequestKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${mqttRequestKey}-backup`,
        JSON.stringify(request)
      )
    })

    it(`schema parsing succeeds if there is no "${mqttRequestKey}" key present in localStorage where the fallback of "null" is chosen`, () => {
      window.localStorage.removeItem(mqttRequestKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(mqttRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the ${mqttRequestKey}" entry from localStorage, sets it as the new request, subscribes to the "MQTTSessionStore" and updates localStorage entries`, () => {
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
      window.localStorage.setItem(mqttRequestKey, JSON.stringify(request))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupMQTTPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(mqttRequestKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setMQTTRequest).toHaveBeenCalledWith(request)
      expect(MQTTRequest$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupGlobalEnvsPersistence", () => {
    // Key read from localStorage across test cases
    const globalEnvKey = "globalEnv"

    it(`shows an error and sets the entry as a backup in localStorage if "${globalEnvKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `globalEnv`
      const globalEnv = [
        {
          // `key` -> `string`
          key: 1,
          value: "testValue",
        },
      ]

      window.localStorage.setItem(globalEnvKey, JSON.stringify(globalEnv))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(globalEnvKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(globalEnvKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${globalEnvKey}-backup`,
        JSON.stringify(globalEnv)
      )
    })

    it(`schema parsing succeeds if there is no "${globalEnvKey}" key present in localStorage where the fallback of "[]" is chosen`, () => {
      window.localStorage.removeItem(globalEnvKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(globalEnvKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it(`reads the "globalEnv" entry from localStorage, dispatches the new value, subscribes to the "environmentsStore" and updates localStorage entries`, () => {
      const globalEnv: Environment["variables"] = [
        { key: "testKey", value: "testValue" },
      ]
      window.localStorage.setItem(globalEnvKey, JSON.stringify(globalEnv))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGlobalEnvsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(globalEnvKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(setGlobalEnvVariables).toHaveBeenCalledWith(globalEnv)
      expect(globalEnv$.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("setupGQLTabsPersistence", () => {
    // Key read from localStorage across test cases
    const gqlTabStateKey = "gqlTabState"

    it(`shows an error and sets the entry as a backup in localStorage if "${gqlTabStateKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `gqlTabState`
      // `lastActiveTabID` -> `string`
      const gqlTabState = { ...GQL_TAB_STATE, lastActiveTabID: 1234 }

      window.localStorage.setItem(gqlTabStateKey, JSON.stringify(gqlTabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(gqlTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(gqlTabStateKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${gqlTabStateKey}-backup`,
        JSON.stringify(gqlTabState)
      )
    })

    it(`skips schema parsing and the loading of persisted tabs if there is no "${gqlTabStateKey}" key present in localStorage`, () => {
      window.localStorage.removeItem(gqlTabStateKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.gqlTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(gqlTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(
        // @ts-expect-error Testing private member
        service.gqlTabService.loadTabsFromPersistedState
      ).not.toHaveBeenCalled()

      expect(watchDebounced).toHaveBeenCalled()
    })

    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = GQL_TAB_STATE
      window.localStorage.setItem(gqlTabStateKey, JSON.stringify(tabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.gqlTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private member
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(gqlTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
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
      window.localStorage.setItem(gqlTabStateKey, "invalid-json")

      console.error = vi.fn()
      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Testing private method
      service.setupGQLTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(gqlTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem(gqlTabStateKey)
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
    // Key read from localStorage across test cases
    const restTabStateKey = "restTabState"

    it(`shows an error and sets the entry as a backup in localStorage if "${restTabStateKey}" read from localStorage doesn't match the schema`, () => {
      // Invalid shape for `restTabState`
      // `lastActiveTabID` -> `string`
      const restTabState = { ...REST_TAB_STATE, lastActiveTabID: 1234 }

      window.localStorage.setItem(restTabStateKey, JSON.stringify(restTabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(restTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).toHaveBeenCalledWith(restTabStateKey)
      expect(setItemSpy).toHaveBeenCalledWith(
        `${restTabStateKey}-backup`,
        JSON.stringify(restTabState)
      )
    })

    it(`skips schema parsing and the loading of persisted tabs if there is no "${restTabStateKey}" key present in localStorage`, () => {
      window.localStorage.removeItem(restTabStateKey)

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private member
      service.restTabService.loadTabsFromPersistedState = vi.fn()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(restTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(
        // @ts-expect-error Testing private member
        service.restTabService.loadTabsFromPersistedState
      ).not.toHaveBeenCalled()

      expect(watchDebounced).toHaveBeenCalled()
    })

    it("loads tabs from the state persisted in localStorage and sets watcher for `persistableTabState`", () => {
      const tabState = REST_TAB_STATE
      window.localStorage.setItem(restTabStateKey, JSON.stringify(tabState))

      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      // @ts-expect-error Spying on private member
      service.restTabService.loadTabsFromPersistedState = vi.fn()

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(restTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
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
      window.localStorage.setItem(restTabStateKey, "invalid-json")

      console.error = vi.fn()
      const getItemSpy = spyOnGetItem()
      const setItemSpy = spyOnSetItem()

      const service = getServiceInstance()

      // @ts-expect-error Spying on private method
      service.showErrorToast = vi.fn()

      service.setupRESTTabsPersistence()

      expect(getItemSpy).toHaveBeenCalledWith(restTabStateKey)

      // @ts-expect-error Testing private method
      expect(service.showErrorToast).not.toHaveBeenCalled()
      expect(setItemSpy).not.toHaveBeenCalled()

      expect(console.error).toHaveBeenCalledWith(
        `Failed parsing persisted tab state, state:`,
        window.localStorage.getItem(restTabStateKey)
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
