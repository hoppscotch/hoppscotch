import { Component, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
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
 * This searcher is responsible for providing environments related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class EnvironmentsSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "ENVIRONMENTS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "environments"
  public searcherSectionTitle = this.t("spotlight.environments.title")

  private readonly spotlight = this.bind(SpotlightService)

  // [ ] Create a new environment
  // [ ] Create a new environment variable, auto-fill key if a text is selected
  // [ ] Edit selected environment
  // [ ] Delete selected environment
  // [ ] Duplicate selected environment
  // [ ] Edit Global environments
  // [ ] Duplicate Global environments
  // [ ] Search and switch environment

  private documents: Record<string, Doc> = reactive({
    new_environment: {
      text: this.t("spotlight.environments.new"),
      alternates: ["new", "environment"],
      icon: markRaw(IconShare),
    },
    new_environment_variable: {
      text: this.t("spotlight.environments.new_variable"),
      alternates: ["new", "environment", "variable"],
      icon: markRaw(IconShare),
    },
    edit_selected_env: {
      text: this.t("spotlight.environments.edit"),
      alternates: ["edit", "environment"],
      icon: markRaw(IconShare),
    },
    delete_selected_env: {
      text: this.t("spotlight.environments.delete"),
      alternates: ["delete", "environment"],
      icon: markRaw(IconShare),
    },
    duplicate_selected_env: {
      text: this.t("spotlight.environments.duplicate"),
      alternates: ["duplicate", "environment"],
      icon: markRaw(IconShare),
    },
    edit_global_env: {
      text: this.t("spotlight.environments.edit_global"),
      alternates: ["edit", "global", "environment"],
      icon: markRaw(IconShare),
    },
    duplicate_global_env: {
      text: this.t("spotlight.environments.duplicate_global"),
      alternates: ["duplicate", "global", "environment"],
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
    switch (id) {
      case "new_environment":
        invokeAction(`modals.environment.new`)
        break
      case "new_environment_variable":
        invokeAction(`modals.environment.new`)
        break
      case "edit_selected_env":
        // invokeAction(`modals.environment.edit`)
        break
      case "delete_selected_env":
        // invokeAction(`modals.environment.delete`)
        break
      case "duplicate_selected_env":
        // invokeAction(`modals.environment.duplicate`)
        break
      case "edit_global_env":
        // invokeAction(`modals.environment.edit`)
        break
      case "duplicate_global_env":
        // invokeAction(`modals.environment.duplicate`)
        break
    }
  }
}
