import { useSettingStatic } from "@composables/settings"
import { usePreferredDark, useStorage } from "@vueuse/core"
import { App, Ref, computed, reactive, watch } from "vue"

import type { HoppBgColor } from "~/newstore/settings"
import { PersistenceService } from "~/services/persistence"
import { HoppModule } from "."
import { getService } from "./dioc"
import { colord } from "colord"
import { isPresetAccentColor, getContrastColor } from "~/helpers/theme"
import { useToast } from "~/composables/toast"

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
      if (isPresetAccentColor(newPref)) {
        root.setAttribute("data-accent", newPref)
        // ensure we don't keep stale inline custom variables
        removeInlineAccentVars()
        return
      }

      // Otherwise treat the value as a custom color string (HEX/RGB) and compute shades
      root.setAttribute("data-accent", "custom")

      try {
        const c = colord(newPref as string)
        if (!c.isValid()) {
          removeInlineAccentVars()
          root.removeAttribute("data-accent")
          return
        }
        const main = c.toHex()
        // Shade factors chosen to approximate the visual steps used by the
        // project's Tailwind-based preset colors (e.g. emerald.400/500/600).
        // These are empirical values picked to give similar contrast and
        // perceptual differences to the preset palette.
        const LIGHTEN_STEP = 0.18 // used for light/"500 -> 400" equivalent
        const DARKEN_STEP = 0.16 // used for dark/"500 -> 600" equivalent
        const GRAD_FROM_LIGHTEN = 0.34 // stronger lighten for gradient start
        const GRAD_TO_DARKEN = 0.12 // slight darken for gradient end

        const light = c.lighten(LIGHTEN_STEP).toHex()
        const dark = c.darken(DARKEN_STEP).toHex()
        const gradFrom = c.lighten(GRAD_FROM_LIGHTEN).toHex()
        const gradVia = c.lighten(LIGHTEN_STEP).toHex()
        const gradTo = c.darken(GRAD_TO_DARKEN).toHex()
        const contrast = getContrastColor(main)

        root.style.setProperty("--accent-color", main)
        root.style.setProperty("--accent-light-color", light)
        root.style.setProperty("--accent-dark-color", dark)
        root.style.setProperty("--accent-contrast-color", contrast)
        root.style.setProperty("--gradient-from-color", gradFrom)
        root.style.setProperty("--gradient-via-color", gradVia)
        root.style.setProperty("--gradient-to-color", gradTo)
      } catch (err) {
        // If parsing fails, fallback to removing any custom inline vars and revert to a default accent
        // Log for debugging and notify the user
        try {
          const toast = useToast()
          toast.info(
            "Failed to apply custom accent color. Reverted to default."
          )
        } catch (_toastErr) {
          // ignore toast errors in non-browser contexts
        }
        console.warn("[theming] Failed parsing custom accent color:", err)
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
