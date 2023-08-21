import { Component, computed, markRaw, reactive } from "vue"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconDownload from "~icons/lucide/download"
import IconCopy from "~icons/lucide/copy"
import { map } from "rxjs"
import { useStreamStatic } from "~/composables/stream"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
}

/**
 *
 * This searcher is responsible for providing response related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class ResponseSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "RESPONSE_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "response"
  public searcherSectionTitle = this.t("spotlight.response.title")

  private readonly spotlight = this.bind(SpotlightService)

  private copyResponseActionEnabled = useStreamStatic(
    activeActions$.pipe(map((actions) => actions.includes("response.copy"))),
    activeActions$.value.includes("response.copy"),
    () => {
      /* noop */
    }
  )[0]

  private downloadResponseActionEnabled = useStreamStatic(
    activeActions$.pipe(
      map((actions) => actions.includes("response.file.download"))
    ),
    activeActions$.value.includes("response.file.download"),
    () => {
      /* noop */
    }
  )[0]

  private documents: Record<string, Doc> = reactive({
    copy_response: {
      text: this.t("spotlight.response.copy"),
      alternates: ["copy", "response"],
      icon: markRaw(IconCopy),
      excludeFromSearch: computed(() => !this.copyResponseActionEnabled.value),
    },
    download_response: {
      text: this.t("spotlight.response.download"),
      alternates: ["download", "response"],
      icon: markRaw(IconDownload),
      excludeFromSearch: computed(
        () => !this.downloadResponseActionEnabled.value
      ),
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
    if (id === "copy_response") invokeAction(`response.copy`)
    if (id === "download_response") invokeAction(`response.file.download`)
  }
}
