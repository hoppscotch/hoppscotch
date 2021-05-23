import { pluck, distinctUntilChanged } from "rxjs/operators"
import has from "lodash/has"
import { Observable } from "rxjs"
import DispatchingStore from "./DispatchingStore"
import type { Dispatchers } from "./DispatchingStore"
import type { KeysMatching } from "~/types/ts-utils"

export const defaultSettings = {
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
}

export type SettingsType = typeof defaultSettings

const validKeys = Object.keys(defaultSettings)

const dispatchers: Dispatchers<SettingsType> = {
  bulkApplySettings(_currentState, payload: Partial<SettingsType>) {
    return payload
  },
  toggleSetting(
    currentState,
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
  applySettingFB<K extends keyof SettingsType>(
    _currentState: SettingsType,
    { settingKey, value }: { settingKey: K; value: SettingsType[K] }
  ) {
    if (!validKeys.includes(settingKey)) {
      console.log(
        `Ignoring non-existent setting key '${settingKey}' assignment by firebase`
      )
      return {}
    }

    const result: Partial<SettingsType> = {}
    result[settingKey] = value

    return result
  },
}

export const settingsStore = new DispatchingStore(defaultSettings, dispatchers)

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

export function applySettingFB<K extends keyof SettingsType>(
  settingKey: K,
  value: SettingsType[K]
) {
  settingsStore.dispatch({
    dispatcher: "applySettingFB",
    payload: {
      settingKey,
      value,
    },
  })
}
