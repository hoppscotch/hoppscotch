import { Service } from "dioc"
import {
  type SpotlightSearcher,
  type SpotlightSearcherResult,
  type SpotlightSearcherSessionState,
} from "../.."
import MiniSearch from "minisearch"
import { Ref, computed, effectScope, ref, watch } from "vue"
import { resolveUnref } from "@vueuse/core"

/**
 * Defines a search result and additional metadata returned by a StaticSpotlightSearcher
 */
export type SearchResult<Doc extends object & { excludeFromSearch?: boolean }> =
  {
    id: string
    score: number
    doc: Doc
  }

/**
 * Options for StaticSpotlightSearcher initialization
 */
export type StaticSpotlightSearcherOptions<
  Doc extends object & { excludeFromSearch?: boolean }
> = {
  /**
   * The array of field names in the given documents to search against
   */
  searchFields: Array<keyof Doc>

  /**
   * The weights to apply to each field in the search, this allows for certain
   * fields to have more priority than others in the search and update the score
   */
  fieldWeights?: Partial<Record<keyof Doc, number>>

  /**
   * How much the score should be boosted if the search matched fuzzily.
   * Increasing this value generally makes the search ignore typos, but reduces performance
   */
  fuzzyWeight?: number

  /**
   * How much the score should be boosted if the search matched by prefix.
   * For e.g, when searching for "hop", "hoppscotch" would match by prefix.
   */
  prefixWeight?: number
}

/**
 * A base class for SpotlightSearcherServices that have a static set of documents
 * that can optionally be toggled against (via the `excludeFromSearch` property in the Doc)
 */
export abstract class StaticSpotlightSearcherService<
    Doc extends object & { excludeFromSearch?: boolean }
  >
  extends Service
  implements SpotlightSearcher
{
  public abstract readonly searcherID: string
  public abstract readonly searcherSectionTitle: string

  private minisearch: MiniSearch

  private loading = ref(false)

  private _documents: Record<string, Doc> = {}

  constructor(private opts: StaticSpotlightSearcherOptions<Doc>) {
    super()

    this.minisearch = new MiniSearch({
      fields: opts.searchFields as string[],
    })
  }

  /**
   * Sets the documents to search against.
   * NOTE: We generally expect this function to only be called once and we expect
   * the documents to not change generally. You can pass a reactive object, if you want to toggle
   * states if you want to.
   * @param docs The documents to search against, this is an object, with the key being the document ID
   */
  protected setDocuments(docs: Record<string, Doc>) {
    this._documents = docs

    this.addDocsToSearchIndex()
  }

  private async addDocsToSearchIndex() {
    this.loading.value = true

    this.minisearch.removeAll()
    this.minisearch.vacuum()

    await this.minisearch.addAllAsync(
      Object.entries(this._documents).map(([id, doc]) => ({
        id,
        ...doc,
      }))
    )

    this.loading.value = false
  }

  /**
   * Specifies how to convert a document into the Spotlight entry format
   * @param result The search result to convert
   */
  protected abstract getSearcherResultForSearchResult(
    result: SearchResult<Doc>
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
        [query, () => this._documents],
        ([query, docs]) => {
          const searchResults = this.minisearch.search(query, {
            prefix: true,
            boost: (this.opts.fieldWeights as any) ?? {},
            weights: {
              fuzzy: this.opts.fuzzyWeight ?? 0.2,
              prefix: this.opts.prefixWeight ?? 0.6,
            },
          })

          results.value = searchResults
            .filter(
              (result) =>
                this._documents[result.id].excludeFromSearch === undefined ||
                this._documents[result.id].excludeFromSearch === false
            )
            .map((result) => {
              return this.getSearcherResultForSearchResult({
                id: result.id,
                score: result.score,
                doc: docs[result.id],
              })
            })
        },
        { immediate: true }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
    }

    return [resultObj, onSessionEnd]
  }

  /**
   * Called when a document is selected from the search results
   * @param id The ID of the document selected
   * @param doc The document information of the document selected
   */
  public abstract onDocSelected(id: string, doc: Doc): void

  public onResultSelect(result: SpotlightSearcherResult): void {
    this.onDocSelected(result.id, resolveUnref(this._documents)[result.id])
  }
}
