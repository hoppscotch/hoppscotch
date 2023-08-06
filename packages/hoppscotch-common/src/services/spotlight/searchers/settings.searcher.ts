import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"
import { getI18n } from "~/modules/i18n"
import { Component, computed, markRaw, reactive } from "vue"
import { useStreamStatic } from "~/composables/stream"
import IconLanguages from "~icons/lucide/languages"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { useSetting } from "~/composables/settings"
import { HoppFontSizes } from "~/newstore/settings"

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

  public readonly searcherID = "settings"
  public searcherSectionTitle = this.t("spotlight.section.user")

  private readonly spotlight = this.bind(SpotlightService)

  private activeActions = useStreamStatic(activeActions$, [], () => {
    /* noop */
  })[0]

  private documents: Record<string, Doc> = reactive({
    change_theme: {
      text: this.t("settings.change_theme"),
      alternates: ["theme"],
      icon: markRaw(IconLanguages),
    },
    increase_font_size: {
      text: this.t("settings.increase_font_size"),
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

  changeFontSize(increase = false) {
    const index = this.fontSizes.indexOf(this.activeFontSize.value)
    const newIndex = index + (increase ? 1 : -1)
    if (newIndex < 0 || newIndex >= this.fontSizes.length) return
    this.activeFontSize.value = this.fontSizes[newIndex]
  }

  public onDocSelected(id: string): void {
    switch (id) {
      case "increase_font_size":
        this.changeFontSize(true)
        break
      case "decrease_font_size":
        this.changeFontSize()
        break
    }
  }
}
