import { Component, markRaw, reactive } from "vue"
import { HoppActionWithNoArgs, invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconArrowRight from "~icons/lucide/arrow-right"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing navigation related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class NavigationSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "NAVIGATION_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "navigation"
  public searcherSectionTitle = this.t("shortcut.navigation.title")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    settings: {
      text: this.t("shortcut.navigation.settings"),
      alternates: ["navigation", "settings", "preferences"],
      icon: markRaw(IconArrowRight),
    },
    rest: {
      text: this.t("shortcut.navigation.rest"),
      alternates: ["navigation", "rest", "request", "http"],
      icon: markRaw(IconArrowRight),
    },
    graphql: {
      text: this.t("shortcut.navigation.graphql"),
      alternates: ["navigation", "graphql", "gql"],
      icon: markRaw(IconArrowRight),
    },
    realtime: {
      text: this.t("shortcut.navigation.realtime"),
      alternates: ["navigation", "realtime", "socket", "ws"],
      icon: markRaw(IconArrowRight),
    },
    documentation: {
      text: this.t("shortcut.navigation.documentation"),
      alternates: ["navigation", "documentation", "docs"],
      icon: markRaw(IconArrowRight),
    },
    profile: {
      text: this.t("shortcut.navigation.profile"),
      alternates: ["navigation", "profile", "account"],
      icon: markRaw(IconArrowRight),
    },
  })

  private docKeys = Object.keys(this.documents)

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
    if (this.docKeys.includes(id) === false) return

    invokeAction(`navigation.jump.${id}` as HoppActionWithNoArgs)
  }
}
