import { Service } from "dioc"
import {
  SpotlightSearcher,
  SpotlightSearcherResult,
  SpotlightSearcherSessionState,
  SpotlightService,
} from "../"
import { Ref, computed, effectScope, markRaw, ref, watch } from "vue"
import { getI18n } from "~/modules/i18n"
import MiniSearch from "minisearch"
import { restHistoryStore } from "~/newstore/history"
import { useTimeAgo } from "@vueuse/core"
import IconHistory from "~icons/lucide/history"
import IconTrash2 from "~icons/lucide/trash-2"
import SpotlightHistoryEntry from "~/components/app/spotlight/entry/History.vue"
import { createNewTab } from "~/helpers/rest/tab"
import { capitalize } from "lodash-es"
import { shortDateTime } from "~/helpers/utils/date"
import { useStreamStatic } from "~/composables/stream"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { map } from "rxjs/operators"

export class HistorySpotlightSearcherService
  extends Service
  implements SpotlightSearcher
{
  public static readonly ID = "HISTORY_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public id = "history"
  public sectionTitle = this.t("tab.history")

  private readonly spotlight = this.bind(SpotlightService)

  private clearHistoryActionEnabled = useStreamStatic(
    activeActions$.pipe(map((actions) => actions.includes("history.clear"))),
    activeActions$.value.includes("history.clear"),
    () => {
      /* noop */
    }
  )[0]

  constructor() {
    super()

    this.spotlight.registerSearcher(this)
  }

  createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const loading = ref(false)
    const results = ref<SpotlightSearcherResult[]>([])

    const minisearch = new MiniSearch({
      fields: ["url", "title", "reltime", "date"],
      storeFields: ["url"],
    })

    const stopWatchHandle = watch(
      this.clearHistoryActionEnabled,
      (enabled) => {
        if (enabled) {
          minisearch.add({
            id: "clear-history",
            title: this.t("action.clear_history"),
          })
        } else {
          minisearch.discard("clear-history")
        }
      },
      { immediate: true }
    )

    minisearch.addAll(
      restHistoryStore.value.state
        .filter((x) => !!x.updatedOn)
        .map((entry, index) => {
          const relTimeString = capitalize(
            useTimeAgo(entry.updatedOn!, {
              updateInterval: 0,
            }).value
          )

          return {
            id: index.toString(),
            url: entry.request.endpoint,
            reltime: relTimeString,
            date: shortDateTime(entry.updatedOn!),
          }
        })
    )

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(query, (query) => {
        results.value = minisearch
          .search(query, {
            prefix: true,
            fuzzy: true,
            boost: {
              reltime: 2,
            },
            weights: {
              fuzzy: 0.2,
              prefix: 0.8,
            },
          })
          .map((x) => {
            const entry = restHistoryStore.value.state[parseInt(x.id)]

            if (x.id === "clear-history") {
              return {
                id: "clear-history",
                icon: markRaw(IconTrash2),
                score: x.score,
                text: {
                  type: "text",
                  text: this.t("action.clear_history"),
                },
              }
            }

            return {
              id: x.id,
              icon: markRaw(IconHistory),
              score: x.score,
              text: {
                type: "custom",
                component: markRaw(SpotlightHistoryEntry),
                componentProps: {
                  historyEntry: entry,
                },
              },
            }
          })
      })
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
      stopWatchHandle()
      minisearch.removeAll()
    }

    const resultObj = computed<SpotlightSearcherSessionState>(() => ({
      loading: loading.value,
      results: results.value,
    }))

    return [resultObj, onSessionEnd]
  }

  onResultSelect(result: SpotlightSearcherResult): void {
    if (result.id === "clear-history") {
      invokeAction("history.clear")
      return
    }

    const req = restHistoryStore.value.state[parseInt(result.id)].request

    createNewTab({
      request: req,
      isDirty: false,
    })
  }
}
