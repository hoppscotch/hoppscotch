import { pluck, distinctUntilChanged } from "rxjs/operators"
import has from "lodash/has"
import { Observable } from "rxjs"
import { Ref } from "@nuxtjs/composition-api"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import type { KeysMatching } from "~/types/ts-utils"
import { useStream } from "~/helpers/utils/composables"

export const HoppBgColors = ["system", "light", "dark", "black"] as const

export type HoppBgColor = typeof HoppBgColors[number]

export const HoppAccentColors = [
  "blue",
  "green",
  "teal",
  "indigo",
  "purple",
  "orange",
  "pink",
  "red",
  "yellow",
] as const

export type HoppAccentColor = typeof HoppAccentColors[number]

export type SettingsType = {
  syncCollections: boolean
  syncHistory: boolean
  syncEnvironments: boolean

  SCROLL_INTO_ENABLED: boolean
  PROXY_ENABLED: boolean
  PROXY_URL: string
  PROXY_KEY: string
  EXTENSIONS_ENABLED: boolean
  EXPERIMENTAL_URL_BAR_ENABLED: boolean
  URL_EXCLUDES: {
    auth: boolean
    httpUser: boolean
    httpPassword: boolean
    bearerToken: boolean
  }
  THEME_COLOR: HoppAccentColor
  BG_COLOR: HoppBgColor
  TELEMETRY_ENABLED: boolean
  SHORTCUT_INDICATOR: boolean
  LEFT_SIDEBAR: boolean
  RIGHT_SIDEBAR: boolean
  ZEN_MODE: boolean
}

export const defaultSettings: SettingsType = {
  syncCollections: true,
  syncHistory: true,
  syncEnvironments: true,

  SCROLL_INTO_ENABLED: true,
  PROXY_ENABLED: false,
  PROXY_URL: "https://proxy.hoppscotch.io/",
  PROXY_KEY: "",
  EXTENSIONS_ENABLED: true,
  EXPERIMENTAL_URL_BAR_ENABLED: false,
  URL_EXCLUDES: {
    auth: true,
    httpUser: true,
    httpPassword: true,
    bearerToken: true,
  },
  THEME_COLOR: "green",
  BG_COLOR: "system",
  TELEMETRY_ENABLED: true,
  SHORTCUT_INDICATOR: false,
  LEFT_SIDEBAR: true,
  RIGHT_SIDEBAR: true,
  ZEN_MODE: false,
}

const validKeys = Object.keys(defaultSettings)

const dispatchers = defineDispatchers({
  bulkApplySettings(
    _currentState: SettingsType,
    payload: Partial<SettingsType>
  ) {
    return payload
  },
  toggleSetting(
    currentState: SettingsType,
    { settingKey }: { settingKey: KeysMatching<SettingsType, boolean> }
  ) {
    if (!has(currentState, settingKey)) {
      console.log(
        `Toggling of a non-existent setting key '${settingKey}' ignored.`
      )
      return {}
    }

    const result: Partial<SettingsType> = {}
    result[settingKey] = !currentState[settingKey]

    return result
  },
  applySetting<K extends keyof SettingsType>(
    _currentState: SettingsType,
    { settingKey, value }: { settingKey: K; value: SettingsType[K] }
  ) {
    if (!validKeys.includes(settingKey)) {
      console.log(
        `Ignoring non-existent setting key '${settingKey}' assignment`
      )
      return {}
    }

    const result: Partial<SettingsType> = {}
    result[settingKey] = value

    return result
  },
})

export const settingsStore = new DispatchingStore(defaultSettings, dispatchers)

/**
 * An observable value to make avail all the state information at once
 */
export const settings$ = settingsStore.subject$.asObservable()

export function getSettingSubject<K extends keyof SettingsType>(
  settingKey: K
): Observable<SettingsType[K]> {
  return settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged())
}

export function bulkApplySettings(settingsObj: Partial<SettingsType>) {
  settingsStore.dispatch({
    dispatcher: "bulkApplySettings",
    payload: settingsObj,
  })
}

export function toggleSetting(settingKey: KeysMatching<SettingsType, boolean>) {
  settingsStore.dispatch({
    dispatcher: "toggleSetting",
    payload: {
      settingKey,
    },
  })
}

export function applySetting<K extends keyof SettingsType>(
  settingKey: K,
  value: SettingsType[K]
) {
  settingsStore.dispatch({
    dispatcher: "applySetting",
    payload: {
      settingKey,
      value,
    },
  })
}

export function useSetting<K extends keyof SettingsType>(
  settingKey: K
): Ref<SettingsType[K]> {
  return useStream(
    settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged()),
    settingsStore.value[settingKey],
    (value: SettingsType[K]) => {
      settingsStore.dispatch({
        dispatcher: "applySetting",
        payload: {
          settingKey,
          value,
        },
      })
    }
  )
}
