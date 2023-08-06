import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"
import { getI18n } from "~/modules/i18n"
import { Component, computed, markRaw, reactive } from "vue"
import { useStreamStatic } from "~/composables/stream"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { useSetting } from "~/composables/settings"
import { HoppBgColor, HoppFontSizes, applySetting } from "~/newstore/settings"

import IconLanguages from "~icons/lucide/languages"
import IconMonitor from "~icons/lucide/monitor"
import IconSun from "~icons/lucide/sun"
import IconCloud from "~icons/lucide/cloud"
import IconMoon from "~icons/lucide/moon"

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

  private activeActions = useStreamStatic(activeActions$, [], () => {
    /* noop */
  })[0]

  private documents: Record<string, Doc> = reactive({
    change_theme_to_system: {
      text: this.t("settings.change_theme_to_system"),
      alternates: ["theme"],
      icon: markRaw(IconMonitor),
    },
    change_theme_to_light: {
      text: this.t("settings.change_theme_to_light"),
      alternates: ["theme"],
      icon: markRaw(IconSun),
    },
    change_theme_to_dark: {
      text: this.t("settings.change_theme_to_dark"),
      alternates: ["theme"],
      icon: markRaw(IconCloud),
    },
    change_theme_to_black: {
      text: this.t("settings.change_theme_to_black"),
      alternates: ["theme"],
      icon: markRaw(IconMoon),
    },
    increase_font_size: {
      text: this.t("settings.increase_font_size"),
      excludeFromSearch: computed(() => this.isLargeFontSize.value),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconLanguages),
    },
    decrease_font_size: {
      text: this.t("settings.decrease_font_size"),
      excludeFromSearch: computed(() => this.isSmallFontSize.value),
      alternates: [
        "font size",
        "change font size",
        "change font",
        "increase font",
      ],
      icon: markRaw(IconLanguages),
    },
    change_interceptor: {
      text: this.t("settings.change_interceptor"),
      alternates: ["interceptor", "change interceptor"],
      icon: markRaw(IconLanguages),
    },
    change_lang: {
      text: this.t("settings.change_language"),
      alternates: ["language", "lang"],
      icon: markRaw(IconLanguages),
    },
    install_ext: {
      text: this.t("settings.install_extension"),
      alternates: ["install extension", "extension"],
      icon: markRaw(IconLanguages),
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

  public onDocSelected(id: string): void {
    switch (id) {
      // theme actions
      case "change_theme_to_system":
        this.changeTheme("system")
        break
      case "change_theme_to_light":
        this.changeTheme("light")
        break
      case "change_theme_to_dark":
        this.changeTheme("dark")
        break
      case "change_theme_to_black":
        this.changeTheme("black")
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
