import { pluck, distinctUntilChanged } from "rxjs/operators"
import { cloneDeep, defaultsDeep, has } from "lodash-es"
import { Observable } from "rxjs"

import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import type { KeysMatching } from "~/types/ts-utils"

export const HoppBgColors = ["system", "light", "dark", "black"] as const

export type HoppBgColor = (typeof HoppBgColors)[number]

export const HoppAccentColors = [
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "yellow",
  "orange",
  "red",
  "pink",
] as const

export type HoppAccentColor = (typeof HoppAccentColors)[number]

export type SettingsDef = {
  syncCollections: boolean
  syncHistory: boolean
  syncEnvironments: boolean

  PROXY_URL: string

  CURRENT_INTERCEPTOR_ID: string

  URL_EXCLUDES: {
    auth: boolean
    httpUser: boolean
    httpPassword: boolean
    bearerToken: boolean
    oauth2Token: boolean
  }
  THEME_COLOR: HoppAccentColor
  BG_COLOR: HoppBgColor
  TELEMETRY_ENABLED: boolean
  EXPAND_NAVIGATION: boolean
  SIDEBAR: boolean
  SIDEBAR_ON_LEFT: boolean
  COLUMN_LAYOUT: boolean
}

export const getDefaultSettings = (): SettingsDef => ({
  syncCollections: true,
  syncHistory: true,
  syncEnvironments: true,

  CURRENT_INTERCEPTOR_ID: "browser", // TODO: Allow the platform definition to take this place

  // TODO: Interceptor related settings should move under the interceptor systems
  PROXY_URL: "https://proxy.hoppscotch.io/",
  URL_EXCLUDES: {
    auth: true,
    httpUser: true,
    httpPassword: true,
    bearerToken: true,
    oauth2Token: true,
  },
  THEME_COLOR: "indigo",
  BG_COLOR: "system",
  TELEMETRY_ENABLED: true,
  EXPAND_NAVIGATION: true,
  SIDEBAR: true,
  SIDEBAR_ON_LEFT: true,
  COLUMN_LAYOUT: true,
})

type ApplySettingPayload = {
  [K in keyof SettingsDef]: {
    settingKey: K
    value: SettingsDef[K]
  }
}[keyof SettingsDef]

const dispatchers = defineDispatchers({
  bulkApplySettings(_currentState: SettingsDef, payload: Partial<SettingsDef>) {
    return payload
  },
  toggleSetting(
    currentState: SettingsDef,
    { settingKey }: { settingKey: KeysMatching<SettingsDef, boolean> }
  ) {
    if (!has(currentState, settingKey)) {
      // console.log(
      //   `Toggling of a non-existent setting key '${settingKey}' ignored`
      // )
      return {}
    }

    const result: Partial<SettingsDef> = {}
    result[settingKey] = !currentState[settingKey]

    return result
  },
  applySetting(
    _currentState: SettingsDef,
    { settingKey, value }: ApplySettingPayload
  ) {
    const result: Partial<SettingsDef> = {
      [settingKey]: value,
    }

    return result
  },
})

export const settingsStore = new DispatchingStore(
  getDefaultSettings(),
  dispatchers
)

/**
 * An observable value to make avail all the state information at once
 */
export const settings$ = settingsStore.subject$.asObservable()

export function getSettingSubject<K extends keyof SettingsDef>(
  settingKey: K
): Observable<SettingsDef[K]> {
  return settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged())
}

export function bulkApplySettings(settingsObj: Partial<SettingsDef>) {
  settingsStore.dispatch({
    dispatcher: "bulkApplySettings",
    payload: settingsObj,
  })
}

export function toggleSetting(settingKey: KeysMatching<SettingsDef, boolean>) {
  settingsStore.dispatch({
    dispatcher: "toggleSetting",
    payload: {
      settingKey,
    },
  })
}

export function applySetting<K extends keyof SettingsDef>(
  settingKey: K,
  value: SettingsDef[K]
) {
  settingsStore.dispatch({
    dispatcher: "applySetting",
    payload: {
      // @ts-expect-error TS is not able to understand the type semantics here
      settingKey,
      // @ts-expect-error TS is not able to understand the type semantics here
      value,
    },
  })
}

export function performSettingsDataMigrations(data: any): SettingsDef {
  const source = cloneDeep(data)

  if (source["EXTENSIONS_ENABLED"]) {
    const result = JSON.parse(source["EXTENSIONS_ENABLED"])

    if (result) source["CURRENT_INTERCEPTOR_ID"] = "extension"
    delete source["EXTENSIONS_ENABLED"]
  }

  if (source["PROXY_ENABLED"]) {
    const result = JSON.parse(source["PROXY_ENABLED"])

    if (result) source["CURRENT_INTERCEPTOR_ID"] = "proxy"
    delete source["PROXY_ENABLED"]
  }

  const final = defaultsDeep(source, getDefaultSettings())

  return final
}
