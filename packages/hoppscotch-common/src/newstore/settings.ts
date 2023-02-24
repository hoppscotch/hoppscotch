import { pluck, distinctUntilChanged } from "rxjs/operators"
import { has } from "lodash-es"
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

export const HoppFontSizes = ["small", "medium", "large"] as const

export type HoppFontSize = (typeof HoppFontSizes)[number]

export type SettingsDef = {
  syncCollections: boolean
  syncHistory: boolean
  syncEnvironments: boolean

  PROXY_ENABLED: boolean
  PROXY_URL: string
  EXTENSIONS_ENABLED: boolean
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
  ZEN_MODE: boolean
  FONT_SIZE: HoppFontSize
  COLUMN_LAYOUT: boolean
}

export const defaultSettings: SettingsDef = {
  syncCollections: true,
  syncHistory: true,
  syncEnvironments: true,

  PROXY_ENABLED: false,
  PROXY_URL: "https://proxy.hoppscotch.io/",
  EXTENSIONS_ENABLED: false,
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
  ZEN_MODE: false,
  FONT_SIZE: "small",
  COLUMN_LAYOUT: true,
}

type ApplySettingPayload = {
  [K in keyof SettingsDef]: {
    settingKey: K
    value: SettingsDef[K]
  }
}[keyof SettingsDef]

const validKeys = Object.keys(defaultSettings)

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
    if (!validKeys.includes(settingKey)) {
      // console.log(
      //   `Ignoring non-existent setting key '${settingKey}' assignment`
      // )
      return {}
    }

    const result: Partial<SettingsDef> = {
      [settingKey]: value,
    }

    return result
  },
})

export const settingsStore = new DispatchingStore(defaultSettings, dispatchers)

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

export function applySetting<K extends ApplySettingPayload>(
  settingKey: K["settingKey"],
  value: K["value"]
) {
  settingsStore.dispatch({
    dispatcher: "applySetting",
    // @ts-expect-error TS is not able to understand the type semantics here
    payload: {
      settingKey,
      value,
    },
  })
}
