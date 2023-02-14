import { Ref } from "vue"
import { settingsStore, SettingsDef } from "~/newstore/settings"
import { pluck, distinctUntilChanged } from "rxjs/operators"
import { useStream, useStreamStatic } from "./stream"

export function useSetting<K extends keyof SettingsDef>(
  settingKey: K
): Ref<SettingsDef[K]> {
  return useStream(
    settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged()),
    settingsStore.value[settingKey],
    (value: SettingsDef[K]) => {
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

/**
 * A static version (does not require component setup)
 * of `useSetting`
 */
export function useSettingStatic<K extends keyof SettingsDef>(
  settingKey: K
): [Ref<SettingsDef[K]>, () => void] {
  return useStreamStatic(
    settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged()),
    settingsStore.value[settingKey],
    (value: SettingsDef[K]) => {
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
