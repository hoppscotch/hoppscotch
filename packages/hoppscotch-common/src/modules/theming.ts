import { useSettingStatic } from "@composables/settings"
import { usePreferredDark, useStorage } from "@vueuse/core"
import { App, Ref, computed, reactive, watch } from "vue"

import type { HoppBgColor } from "~/newstore/settings"
import { PersistenceService } from "~/services/persistence"
import { HoppModule } from "."
import { getService } from "./dioc"
import { colord } from "colord"
import { HoppAccentColors } from "~/newstore/settings"

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

  const root = document.documentElement
  const removeInlineAccentVars = () => {
    ;[
      "--accent-color",
      "--accent-light-color",
      "--accent-dark-color",
      "--accent-contrast-color",
      "--gradient-from-color",
      "--gradient-via-color",
      "--gradient-to-color",
    ].forEach((v) => root.style.removeProperty(v))
  }

  watch(
    pref,
    (newPref) => {
      if (!newPref) return

      // If a preset accent color is chosen, keep using the SCSS mixins via data-accent
      if ((HoppAccentColors as readonly string[]).includes(newPref as string)) {
        root.setAttribute("data-accent", newPref as string)
        // ensure we don't keep stale inline custom variables
        removeInlineAccentVars()
        return
      }

      // Otherwise treat the value as a custom color string (HEX/RGB) and compute shades
      root.setAttribute("data-accent", "custom")

      try {
        const c = colord(newPref as string)
        const main = c.toHex()
        const light = c.lighten(0.18).toHex()
        const dark = c.darken(0.16).toHex()
        const gradFrom = c.lighten(0.34).toHex()
        const gradVia = c.lighten(0.18).toHex()
        const gradTo = c.darken(0.12).toHex()
        const contrast = c.isLight() ? "#000000" : "#ffffff"

        root.style.setProperty("--accent-color", main)
        root.style.setProperty("--accent-light-color", light)
        root.style.setProperty("--accent-dark-color", dark)
        root.style.setProperty("--accent-contrast-color", contrast)
        root.style.setProperty("--gradient-from-color", gradFrom)
        root.style.setProperty("--gradient-via-color", gradVia)
        root.style.setProperty("--gradient-to-color", gradTo)
      } catch (_e) {
        // If parsing fails, fallback to removing any custom inline vars and revert to a default accent
        removeInlineAccentVars()
        root.removeAttribute("data-accent")
      }
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
