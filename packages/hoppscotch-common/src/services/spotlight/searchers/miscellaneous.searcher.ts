import { Component, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconShare from "~icons/lucide/share"
import { Container } from "dioc"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing miscellaneous related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class MiscellaneousSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "MISCELLANEOUS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "miscellaneous"
  public searcherSectionTitle = this.t("spotlight.miscellaneous.title")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    invite_hoppscotch: {
      text: this.t("spotlight.miscellaneous.invite"),
      alternates: ["invite", "share", "hoppscotch"],
      icon: markRaw(IconShare),
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

  public onDocSelected(id: string): void {
    if (id === "invite_hoppscotch") invokeAction(`modals.share.toggle`)
  }
}
