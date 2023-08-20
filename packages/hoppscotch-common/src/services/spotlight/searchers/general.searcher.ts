import { Component, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconBook from "~icons/lucide/book"
import IconGithub from "~icons/lucide/github"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconZap from "~icons/lucide/zap"

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
      icon: markRaw(IconLifeBuoy),
    },
    chat_with_support: {
      text: this.t("spotlight.general.chat"),
      alternates: ["chat", "support", "hoppscotch"],
      icon: markRaw(IconMessageCircle),
    },
    open_docs: {
      text: this.t("spotlight.general.open_docs"),
      alternates: ["docs", "documentation", "hoppscotch"],
      icon: markRaw(IconBook),
    },
    open_keybindings: {
      text: this.t("spotlight.general.open_keybindings"),
      alternates: ["key", "shortcuts", "binding"],
      icon: markRaw(IconZap),
    },
    social_links: {
      text: this.t("spotlight.general.social"),
      alternates: ["social", "github", "binding"],
      icon: markRaw(IconGithub),
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

  private openDocs() {
    const url = "https://docs.hoppscotch.io"
    window.open(url, "_blank")
  }

  public onDocSelected(id: string): void {
    switch (id) {
      case "open_help":
        invokeAction("modals.support.toggle")
        break
      case "chat_with_support":
        invokeAction("flyouts.chat.open")
        break
      case "open_docs":
        this.openDocs()
        break
      case "open_keybindings":
        invokeAction("flyouts.keybinds.toggle")
        break
      case "social_links":
        invokeAction("modals.social.toggle")
        break
    }
  }
}
