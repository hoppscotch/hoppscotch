import { Component, markRaw, reactive } from "vue"
import { HoppActionWithNoArgs, invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconShare from "~icons/lucide/share"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing general related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class GeneralSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "GENERAL_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "general"
  public searcherSectionTitle = this.t("spotlight.general.title")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    open_help: {
      text: this.t("spotlight.general.help_menu"),
      alternates: ["help", "hoppscotch"],
      icon: markRaw(IconShare),
    },
    chat_with_support: {
      text: this.t("spotlight.general.chat"),
      alternates: ["chat", "support", "hoppscotch"],
      icon: markRaw(IconShare),
    },
    open_docs: {
      text: this.t("spotlight.general.open_docs"),
      alternates: ["docs", "documentation", "hoppscotch"],
      icon: markRaw(IconShare),
    },
    open_keybindings: {
      text: this.t("spotlight.general.open_keybindings"),
      alternates: ["key", "shortcuts", "binding"],
      icon: markRaw(IconShare),
    },
    social_links: {
      text: this.t("spotlight.general.social"),
      alternates: ["social", "github", "binding"],
      icon: markRaw(IconShare),
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
    if (id === "invite_hoppscotch")
      invokeAction(`modals.share.toggle` as HoppActionWithNoArgs)
  }
}
