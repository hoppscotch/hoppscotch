import { Component, computed, markRaw, reactive } from "vue"
import { useSetting } from "~/composables/settings"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { HoppBgColor, applySetting } from "~/newstore/settings"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconCloud from "~icons/lucide/cloud"
import IconLanguages from "~icons/lucide/languages"
import IconMonitor from "~icons/lucide/monitor"
import IconMoon from "~icons/lucide/moon"
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
 * This searcher is responsible for providing settings related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class SettingsSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "SETTINGS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  private activeFontSize = useSetting("FONT_SIZE")

  public readonly searcherID = "settings"
  public searcherSectionTitle = this.t("navigation.settings")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
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
    font_size_sm: {
      text: this.t("spotlight.font_size_sm"),
      onClick: () => {
        console.log("clicked")
      },
      excludeFromSearch: computed(() => this.activeFontSize.value === "small"),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconType),
    },
    font_size_md: {
      text: this.t("spotlight.font_size_md"),
      excludeFromSearch: computed(() => this.activeFontSize.value === "medium"),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconType),
    },
    font_size_lg: {
      text: this.t("spotlight.font_size_lg"),
      excludeFromSearch: computed(() => this.activeFontSize.value === "large"),
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

  installExtension() {
    const url = navigator.userAgent.includes("Firefox")
      ? "https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
      : "https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
    window.open(url, "_blank")
  }

  public onDocSelected(id: string): void {
    switch (id) {
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
      case "font_size_sm":
        this.activeFontSize.value = "small"
        break
      case "font_size_md":
        this.activeFontSize.value = "medium"
        break
      case "font_size_lg":
        this.activeFontSize.value = "large"
        break
    }
  }
}
