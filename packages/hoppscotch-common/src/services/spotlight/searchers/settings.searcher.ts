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
import IconGlobe from "~icons/lucide/globe"
import IconMonitor from "~icons/lucide/monitor"
import IconMoon from "~icons/lucide/moon"
import IconSun from "~icons/lucide/sun"
import IconCheckCircle from "~icons/lucide/check-circle"
import { Container } from "dioc"

type Doc = {
  text: string | string[]
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

  private activeTheme = useSetting("BG_COLOR")

  public readonly searcherID = "settings"
  public searcherSectionTitle = this.t("navigation.settings")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    theme_system: {
      text: [
        this.t("spotlight.section.theme"),
        this.t("spotlight.settings.theme.system"),
      ],
      alternates: ["theme"],
      icon: computed(() =>
        this.activeTheme.value === "system"
          ? markRaw(IconCheckCircle)
          : markRaw(IconMonitor)
      ),
    },
    theme_light: {
      text: [
        this.t("spotlight.section.theme"),
        this.t("spotlight.settings.theme.light"),
      ],
      alternates: ["theme"],
      icon: computed(() =>
        this.activeTheme.value === "light"
          ? markRaw(IconCheckCircle)
          : markRaw(IconSun)
      ),
    },
    theme_dark: {
      text: [
        this.t("spotlight.section.theme"),
        this.t("spotlight.settings.theme.dark"),
      ],
      alternates: ["theme"],
      icon: computed(() =>
        this.activeTheme.value === "dark"
          ? markRaw(IconCheckCircle)
          : markRaw(IconCloud)
      ),
    },
    theme_black: {
      text: [
        this.t("spotlight.section.theme"),
        this.t("spotlight.settings.theme.black"),
      ],
      alternates: ["theme"],
      icon: computed(() =>
        this.activeTheme.value === "black"
          ? markRaw(IconCheckCircle)
          : markRaw(IconMoon)
      ),
    },

    change_lang: {
      text: [
        this.t("spotlight.section.interface"),
        this.t("spotlight.settings.change_language"),
      ],
      alternates: ["language", "change language"],
      icon: markRaw(IconGlobe),
    },
  })

  // TODO: Constructors are no longer recommended as of dioc > 3, move to onServiceInit
  constructor(c: Container) {
    super(c, {
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })
  }

  override onServiceInit() {
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

  public onDocSelected(id: string): void {
    switch (id) {
      case "change_lang":
        invokeAction("navigation.jump.settings")
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
    }
  }
}
