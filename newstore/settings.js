import { pluck, distinct } from "rxjs/operators"
import has from "lodash/has"
import DispatchingStore from "./DispatchingStore"

export const defaultSettings = {
  syncCollections: true,
  syncHistory: true,
  syncEnvironments: true,

  SCROLL_INTO_ENABLED: true,
  FRAME_COLORS_ENABLED: false,
  PROXY_ENABLED: false,
  PROXY_URL: "https://hoppscotch.apollosoftware.xyz/",
  PROXY_KEY: "",
  EXTENSIONS_ENABLED: true,
  EXPERIMENTAL_URL_BAR_ENABLED: false,
  URL_EXCLUDES: {
    auth: true,
    httpUser: true,
    httpPassword: true,
    bearerToken: true
  }
}

const validKeys = Object.keys(defaultSettings)

const dispatchers = {
  bulkApplySettings(_currentState, payload) {
    return payload
  },
  toggleSetting(currentState, { settingKey }) {
    if (!has(currentState, settingKey)) {
      console.log(`Toggling of a non-existent setting key '${settingKey}' ignored.`)
      return {}
    }

    const result = {}
    result[settingKey] = !currentState[settingKey]

    return result
  },
  applySetting(_currentState, { settingKey, value }) {
    if (!validKeys.includes(settingKey)) {
      console.log(`Ignoring non-existent setting key '${settingKey}' assignment`)
      return {}
    }

    const result = {}
    result[settingKey] = value

    return result
  }
}


export const settingsStore = new DispatchingStore(defaultSettings, dispatchers)

export function getSettingSubject(settingKey) {
  return settingsStore.subject$.pipe(pluck(settingKey), distinct())
}

export function bulkApplySettings(settingsObj) {
  settingsStore.dispatch({
    dispatcher: "bulkApplySettings",
    payload: settingsObj
  })
}

export function toggleSetting(settingKey) {
  settingsStore.dispatch({
    dispatcher: "toggleSetting",
    payload: {
      settingKey
    }
  })
}

export function applySetting(settingKey, value) {
  settingsStore.dispatch({
    dispatcher: "applySetting",
    payload: {
      settingKey,
      value
    }
  })
}

