import { useSettingStatic } from "@composables/settings"
import { usePreferredDark, useStorage } from "@vueuse/core"
import { App, Ref, computed, reactive, watch } from "vue"

import type { HoppBgColor } from "~/newstore/settings"
import { PersistenceService } from "~/services/persistence"
import { HoppModule } from "."
import { getService } from "./dioc"

export type HoppColorMode = {
  preference: HoppBgColor
  value: Readonly<Exclude<HoppBgColor, "system">>
}

const persistenceService = getService(PersistenceService)

const applyColorMode = (app: App) => {
  const [settingPref] = useSettingStatic("BG_COLOR")

  const currentLocalPreference = useStorage<HoppBgColor>(
    "nuxt-color-mode",
    "system",
    persistenceService.hoppLocalConfigStorage,
    {
      listenToStorageChanges: true,
    }
  )

  const systemPrefersDark = usePreferredDark()

  const selection = computed<Exclude<HoppBgColor, "system">>(() => {
    if (currentLocalPreference.value === "system") {
      return systemPrefersDark.value ? "dark" : "light"
    }
    return currentLocalPreference.value
  })

  watch(
    selection,
    (newSelection) => {
      document.documentElement.setAttribute("class", newSelection)
    },
    { immediate: true }
  )

  watch(
    settingPref,
    (newPref) => {
      currentLocalPreference.value = newPref
    },
    { immediate: true }
  )

  const exposed: HoppColorMode = reactive({
    preference: currentLocalPreference,
    // Marking as readonly to not allow writes to this ref
    value: selection as Readonly<Ref<Exclude<HoppBgColor, "system">>>,
  })

  app.provide("colorMode", exposed)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const applyAccentColor = (_app: App) => {
  const [pref] = useSettingStatic("THEME_COLOR")

  watch(
    pref,
    (newPref) => {
      document.documentElement.setAttribute("data-accent", newPref)
    },
    { immediate: true }
  )
}

export default <HoppModule>{
  onVueAppInit(app) {
    applyColorMode(app)
    applyAccentColor(app)
  },
}
