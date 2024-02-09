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
          // @ts-expect-error TS is not able to understand the type semantics here
          settingKey,
          // @ts-expect-error TS is not able to understand the type semantics here
          value,
        },
      })
    }
  )
}

export function useNestedSetting<
  K extends keyof SettingsDef,
  P extends keyof SettingsDef[K],
>(settingKey: K, property: P): Ref<SettingsDef[K][P]> {
  return useStream(
    settingsStore.subject$.pipe(
      pluck(settingKey),
      pluck(property),
      distinctUntilChanged()
    ),
    settingsStore.value[settingKey][property],
    (value: SettingsDef[K][P]) => {
      settingsStore.dispatch({
        dispatcher: "applyNestedSetting",
        payload: {
          // @ts-expect-error TS is not able to understand the type semantics here
          settingKey,
          // @ts-expect-error TS is not able to understand the type semantics here
          property,
          // @ts-expect-error TS is not able to understand the type semantics here
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
          // @ts-expect-error TS is not able to understand the type semantics here
          settingKey,
          // @ts-expect-error TS is not able to understand the type semantics here
          value,
        },
      })
    }
  )
}
