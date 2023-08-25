import { Component, computed, markRaw, reactive } from "vue"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import { useRoute } from "vue-router"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import {
  closeOtherTabs,
  closeTab,
  createNewTab,
  currentTabID,
  getActiveTabs,
} from "~/helpers/rest/tab"
import IconCopy from "~icons/lucide/copy"
import IconCopyPlus from "~icons/lucide/copy-plus"
import IconXCircle from "~icons/lucide/x-circle"
import IconXSquare from "~icons/lucide/x-square"
import { invokeAction } from "~/helpers/actions"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
}

/**
 *
 * This searcher is responsible for providing REST Tab related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class TabSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "TAB_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "tab"
  public searcherSectionTitle = this.t("spotlight.tab.title")

  private readonly spotlight = this.bind(SpotlightService)

  private route = useRoute()
  private showAction = computed(
    () => this.route.name === "index" ?? this.route.name === "graphql"
  )

  private documents: Record<string, Doc> = reactive({
    duplicate_tab: {
      text: this.t("spotlight.tab.duplicate"),
      alternates: ["tab", "duplicate", "duplicate tab"],
      icon: markRaw(IconCopy),
      excludeFromSearch: computed(() => !this.showAction.value),
    },
    close_current_tab: {
      text: this.t("spotlight.tab.close_current"),
      alternates: ["tab", "close", "close tab"],
      icon: markRaw(IconXCircle),
      excludeFromSearch: computed(
        () => !this.showAction.value || getActiveTabs().value.length === 1
      ),
    },
    close_other_tabs: {
      text: this.t("spotlight.tab.close_others"),
      alternates: ["tab", "close", "close all"],
      icon: markRaw(IconXSquare),
      excludeFromSearch: computed(
        () => !this.showAction.value || getActiveTabs().value.length < 2
      ),
    },
    open_new_tab: {
      text: this.t("spotlight.tab.new_tab"),
      alternates: ["tab", "new", "open tab"],
      icon: markRaw(IconCopyPlus),
      excludeFromSearch: computed(() => !this.showAction.value),
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
    if (id === "duplicate_tab")
      invokeAction("request.duplicate-tab", {
        tabID: currentTabID.value,
      })
    if (id === "close_current_tab") closeTab(currentTabID.value)
    if (id === "close_other_tabs") closeOtherTabs(currentTabID.value)
    if (id === "open_new_tab")
      createNewTab({
        request: getDefaultRESTRequest(),
        isDirty: false,
      })
  }
}
