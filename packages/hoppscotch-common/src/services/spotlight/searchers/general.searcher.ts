import { Component, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconLinkedIn from "~icons/brands/linkedin"
import IconTwitter from "~icons/brands/twitter"
import IconBook from "~icons/lucide/book"
import IconDiscord from "~icons/lucide/link"
import IconGitHub from "~icons/lucide/github"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconZap from "~icons/lucide/zap"

type Doc = {
  text: string | string[]
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
    link_github: {
      text: [this.t("spotlight.general.social"), "GitHub"],
      alternates: ["social", "github", "link"],
      icon: markRaw(IconGitHub),
    },
    link_twitter: {
      text: [this.t("spotlight.general.social"), "Twitter"],
      alternates: ["social", "twitter", "link"],
      icon: markRaw(IconTwitter),
    },
    link_discord: {
      text: [this.t("spotlight.general.social"), "Discord"],
      alternates: ["social", "discord", "link"],
      icon: markRaw(IconDiscord),
    },
    link_linkedin: {
      text: [this.t("spotlight.general.social"), "LinkedIn"],
      alternates: ["social", "linkedin", "link"],
      icon: markRaw(IconLinkedIn),
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

  private openURL(url: string) {
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
        this.openURL("https://docs.hoppscotch.io")
        break
      case "open_keybindings":
        invokeAction("flyouts.keybinds.toggle")
        break
      case "link_github":
        this.openURL("https://hoppscotch.io/github")
        break
      case "link_twitter":
        this.openURL("https://twitter.com/hoppscotch_io")
        break
      case "link_discord":
        this.openURL("https://hoppscotch.io/discord")
        break
      case "link_linkedin":
        this.openURL("https://www.linkedin.com/company/hoppscotch/")
        break
    }
  }
}
