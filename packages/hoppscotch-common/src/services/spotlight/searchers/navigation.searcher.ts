import { Component, markRaw, reactive } from "vue"
import { HoppActionWithNoArgs, invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconArrowRight from "~icons/lucide/arrow-right"
import IconArrowLeft from "~icons/lucide/arrow-left"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing user related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class NavigationSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "NAVIGATION_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "navigation"
  public searcherSectionTitle = this.t("shortcut.navigation.title")

  private readonly spotlight = this.bind(SpotlightService)

  // All keys prefixed with "nav_" are reserved for navigation actions and satisfy HoppActionWithNoArgs type with the key being the action name.
  private documents: Record<string, Doc> = reactive({
    nav_back: {
      text: this.t("shortcut.navigation.back"),
      alternates: ["navigation", "back", "previous"],
      icon: markRaw(IconArrowLeft),
    },
    nav_forward: {
      text: this.t("shortcut.navigation.forward"),
      alternates: ["navigation", "forward", "next"],
      icon: markRaw(IconArrowRight),
    },
    nav_settings: {
      text: this.t("shortcut.navigation.settings"),
      alternates: ["navigation", "settings", "preferences"],
      icon: markRaw(IconArrowRight),
    },
    nav_rest: {
      text: this.t("shortcut.navigation.rest"),
      alternates: ["navigation", "rest", "request", "http"],
      icon: markRaw(IconArrowRight),
    },
    nav_graphql: {
      text: this.t("shortcut.navigation.graphql"),
      alternates: ["navigation", "graphql", "gql"],
      icon: markRaw(IconArrowRight),
    },
    nav_realtime: {
      text: this.t("shortcut.navigation.realtime"),
      alternates: ["navigation", "realtime", "socket", "ws"],
      icon: markRaw(IconArrowRight),
    },
    nav_documentation: {
      text: this.t("shortcut.navigation.documentation"),
      alternates: ["navigation", "documentation", "docs"],
      icon: markRaw(IconArrowRight),
    },
    nav_profile: {
      text: this.t("shortcut.navigation.profile"),
      alternates: ["navigation", "profile", "account"],
      icon: markRaw(IconArrowRight),
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
    const key = id.replace("nav_", "")
    const action = ("navigation.jump." + key) as HoppActionWithNoArgs
    invokeAction(action)
  }
}
