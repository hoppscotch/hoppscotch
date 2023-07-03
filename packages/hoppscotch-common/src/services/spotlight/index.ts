import { Service } from "dioc"
import { watch, type Ref, ref, reactive, effectScope, Component } from "vue"

export type SpotlightResultTextType<T extends object | Component = never> =
  | { type: "text"; text: string[] | string }
  | {
      type: "custom"
      component: T
      componentProps: T extends Component<infer Props> ? Props : never
    }

export type SpotlightSearcherResult = {
  id: string
  text: SpotlightResultTextType<any>
  icon: object | Component
  score: number
  meta?: {
    keyboardShortcut?: string[]
  }
}

export type SpotlightSearcherSessionState = {
  loading: boolean
  results: SpotlightSearcherResult[]
}

export interface SpotlightSearcher {
  id: string
  sectionTitle: string

  createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void]

  onResultSelect(result: SpotlightSearcherResult): void
}

export type SpotlightSearchState = {
  loading: boolean
  results: Record<
    string,
    {
      title: string
      avgScore: number
      results: SpotlightSearcherResult[]
    }
  >
}

export class SpotlightService extends Service {
  public static readonly ID = "SPOTLIGHT_SERVICE"

  private searchers: Map<string, SpotlightSearcher> = new Map()

  public registerSearcher(searcher: SpotlightSearcher) {
    this.searchers.set(searcher.id, searcher)
  }

  public getAllSearchers(): IterableIterator<[string, SpotlightSearcher]> {
    return this.searchers.entries()
  }

  public createSearchSession(
    query: Ref<string>
  ): [Ref<SpotlightSearchState>, () => void] {
    const searchSessions = Array.from(this.searchers.values()).map(
      (x) => [x, ...x.createSearchSession(query)] as const
    )

    const loadingSearchers = reactive(new Set())
    const onSessionEndList: Array<() => void> = []

    const resultObj = ref<SpotlightSearchState>({
      loading: false,
      results: {},
    })

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      for (const [searcher, state, onSessionEnd] of searchSessions) {
        watch(
          state,
          (newState) => {
            if (newState.loading) {
              loadingSearchers.add(searcher.id)
            } else {
              loadingSearchers.delete(searcher.id)
            }

            if (newState.results.length === 0) {
              delete resultObj.value.results[searcher.id]
            } else {
              resultObj.value.results[searcher.id] = {
                title: searcher.sectionTitle,
                avgScore:
                  newState.results.reduce((acc, x) => acc + x.score, 0) /
                  newState.results.length,
                results: newState.results,
              }
            }
          },
          { immediate: true }
        )

        onSessionEndList.push(onSessionEnd)
      }

      watch(
        loadingSearchers,
        (set) => {
          resultObj.value.loading = set.size > 0
        },
        { immediate: true }
      )
    })

    const onSearchEnd = () => {
      scopeHandle.stop()

      for (const onEnd of onSessionEndList) {
        onEnd()
      }
    }

    return [resultObj, onSearchEnd]
  }

  public selectSearchResult(
    searcherID: string,
    result: SpotlightSearcherResult
  ) {
    this.searchers.get(searcherID)?.onResultSelect(result)
  }
}
