import { Service } from "dioc"
import {
  type SpotlightSearcher,
  type SpotlightSearcherResult,
  type SpotlightSearcherSessionState,
} from "../"
import MiniSearch, { type SearchResult } from "minisearch"
import { Ref, computed, effectScope, ref, watch } from "vue"
import { MaybeRef, resolveUnref } from "@vueuse/core"

export abstract class StaticSpotlightSearcherService<
    Doc extends Record<string, unknown> & {
      excludeFromSearch?: boolean
    } & Record<DocFields[number], string>,
    DocFields extends Array<keyof Doc>
  >
  extends Service
  implements SpotlightSearcher
{
  public abstract readonly id: string
  public abstract readonly sectionTitle: string

  private minisearch: MiniSearch

  private loading = ref(false)

  constructor(
    private documents: MaybeRef<Record<string, Doc>>,
    searchFields: Array<keyof Doc>,
    resultFields: DocFields
  ) {
    super()

    this.minisearch = new MiniSearch({
      fields: searchFields as string[],
      storeFields: resultFields as string[],
    })

    this.addDocsToSearchIndex(resolveUnref(documents))
  }

  private async addDocsToSearchIndex(docs: Record<string, Doc>) {
    this.loading.value = true

    await this.minisearch.addAllAsync(
      Object.entries(docs).map(([id, doc]) => ({
        id,
        ...doc,
      }))
    )

    this.loading.value = false
  }

  protected abstract getSearcherResultForSearchResult(
    result: Pick<Doc & SearchResult, DocFields[number] | "id" | "score">
  ): SpotlightSearcherResult

  public createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const results = ref<SpotlightSearcherResult[]>([])

    const resultObj = computed<SpotlightSearcherSessionState>(() => ({
      loading: this.loading.value,
      results: results.value,
    }))

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(
        [query, () => resolveUnref(this.documents)],
        ([query, docs]) => {
          const searchResults = this.minisearch.search(query, {
            prefix: true,
            fuzzy: 0.2,
            weights: {
              fuzzy: 0.2,
              prefix: 0.6,
            },
          })

          results.value = searchResults
            .filter(
              (result) =>
                docs[result.id].excludeFromSearch === undefined ||
                docs[result.id].excludeFromSearch === false
            )
            .map((result) =>
              this.getSearcherResultForSearchResult(result as any)
            )
        },
        { immediate: true }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
    }

    return [resultObj, onSessionEnd]
  }

  public abstract onResultSelect(result: SpotlightSearcherResult): void
}
