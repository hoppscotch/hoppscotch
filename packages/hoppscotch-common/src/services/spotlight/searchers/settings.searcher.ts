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

  public readonly searcherID = "settings"
  public searcherSectionTitle = this.t("spotlight.section.user")

  private readonly spotlight = this.bind(SpotlightService)

  private activeActions = useStreamStatic(activeActions$, [], () => {
    /* noop */
  })[0]

  private documents: Record<string, Doc> = reactive({
    change_font_size: {
      text: this.t("settings.change_font_size"),
      alternates: ["font size", "change font size", "change font"],
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

  public onDocSelected(id: string): void {
    switch (id) {
      case "change_font_size":
        console.log("hello hunny bunny")
        // invokeAction("user.login")
        break
    }
  }
}
