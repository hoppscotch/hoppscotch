import { Component, computed, markRaw, reactive } from "vue"
import { useSetting } from "~/composables/settings"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { HoppBgColor, HoppFontSizes, applySetting } from "~/newstore/settings"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconCloud from "~icons/lucide/cloud"
import IconLanguages from "~icons/lucide/languages"
import IconMonitor from "~icons/lucide/monitor"
import IconMoon from "~icons/lucide/moon"
import IconSettings from "~icons/lucide/settings"
import IconSun from "~icons/lucide/sun"
import {
  default as IconCable,
  default as IconExtension,
  default as IconType,
} from "~icons/lucide/type"

type Doc = {
  text: string
  excludeFromSearch?: boolean
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing user related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class SettingsSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "SETTINGS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  fontSizes = HoppFontSizes
  activeFontSize = useSetting("FONT_SIZE")
  isLargeFontSize = computed(
    () =>
      this.fontSizes.indexOf(this.activeFontSize.value) ===
      this.fontSizes.length - 1
  )
  isSmallFontSize = computed(
    () => this.fontSizes.indexOf(this.activeFontSize.value) === 0
  )

  public readonly searcherID = "settings"
  public searcherSectionTitle = this.t("spotlight.section.user")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    nav_settings: {
      text: this.t("navigation.settings"),
      alternates: ["settings", "preferences"],
      icon: markRaw(IconSettings),
    },
    theme_system: {
      text: this.t("shortcut.theme.system"),
      alternates: ["theme"],
      icon: markRaw(IconMonitor),
    },
    theme_light: {
      text: this.t("shortcut.theme.light"),
      alternates: ["theme"],
      icon: markRaw(IconSun),
    },
    theme_dark: {
      text: this.t("shortcut.theme.dark"),
      alternates: ["theme"],
      icon: markRaw(IconCloud),
    },
    theme_black: {
      text: this.t("shortcut.theme.black"),
      alternates: ["theme"],
      icon: markRaw(IconMoon),
    },
    increase_font_size: {
      text: this.t("spotlight.increase_font_size"),
      excludeFromSearch: computed(() => this.isLargeFontSize.value),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconType),
    },
    decrease_font_size: {
      text: this.t("spotlight.decrease_font_size"),
      excludeFromSearch: computed(() => this.isSmallFontSize.value),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconType),
    },
    change_interceptor: {
      text: this.t("spotlight.change_interceptor"),
      alternates: ["interceptor", "change interceptor"],
      icon: markRaw(IconCable),
    },
    change_lang: {
      text: this.t("spotlight.change_language"),
      alternates: ["language", "lang"],
      icon: markRaw(IconLanguages),
    },
    install_ext: {
      text: this.t("spotlight.install_extension"),
      alternates: ["install extension", "extension"],
      icon: markRaw(IconExtension),
    },
  })

  constructor() {
    super({
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })

    this.setDocuments(this.documents)
    this.spotlight.registerSearcher(this)
  }

  protected getSearcherResultForSearchResult(
    result: SearchResult<Doc>
  ): SpotlightSearcherResult {
    return {
      id: result.id,
      icon: result.doc.icon,
      text: { type: "text", text: result.doc.text },
      score: result.score,
    }
  }

  changeTheme(theme: HoppBgColor) {
    applySetting("BG_COLOR", theme)
  }

  changeFontSize(increase = false) {
    const index = this.fontSizes.indexOf(this.activeFontSize.value)
    const newIndex = index + (increase ? 1 : -1)
    // if (newIndex < 0 || newIndex >= this.fontSizes.length) return
    this.activeFontSize.value = this.fontSizes[newIndex]
  }

  installExtension() {
    const url = navigator.userAgent.includes("Firefox")
      ? "https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
      : "https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
    window.open(url, "_blank")
  }

  public onDocSelected(id: string): void {
    switch (id) {
      case "nav_settings":
        invokeAction("navigation.jump.settings")
        break

      case "change_interceptor":
        invokeAction("navigation.jump.settings")
        break

      case "change_lang":
        invokeAction("navigation.jump.settings")
        break

      case "install_ext":
        this.installExtension()
        break

      // theme actions
      case "theme_system":
        invokeAction("settings.theme.system")
        break
      case "theme_light":
        invokeAction("settings.theme.light")
        break
      case "theme_dark":
        invokeAction("settings.theme.dark")
        break
      case "theme_black":
        invokeAction("settings.theme.black")
        break

      // font size actions
      case "increase_font_size":
        this.changeFontSize(true)
        break
      case "decrease_font_size":
        this.changeFontSize()
        break
    }
  }
}
