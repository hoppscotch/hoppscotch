import { Service } from "dioc"
import { cloneDeep } from "lodash-es"
import { computed, reactive } from "vue"

/**
 * Defines the saved update source for a collection.
 */
export type CollectionUpdateSource = {
  importerId: string
  sourceId?: string
  sourceType: "url" | "file"
  url?: string
  fileName?: string
  updatedAt?: number
}

/**
 * This service is used to store and manage the last used update source
 * configuration for each collection (e.g. OpenAPI URL/file, Postman file, Gist URL, etc.)
 */
export class CollectionUpdateSourceService extends Service {
  public static readonly ID = "COLLECTION_UPDATE_SOURCE_SERVICE"

  /**
   * Map of update source configs for collections.
   * Key is the collection ID or ref ID.
   * Value is the collection update source configuration.
   */
  public updateSources = reactive(new Map<string, CollectionUpdateSource>())

  /**
   * Gets the saved update source for a given collection ID.
   * @param id ID or _ref_id of the collection.
   * @returns Saved update source for the given collection ID, or `undefined` if not found.
   */
  public getUpdateSource(id: string): CollectionUpdateSource | undefined {
    return this.updateSources.get(id)
  }

  /**
   * Sets the update source for a given collection ID.
   * @param id ID or _ref_id of the collection.
   * @param source Update source config to save.
   */
  public setUpdateSource(id: string, source: CollectionUpdateSource) {
    this.updateSources.set(id, cloneDeep(source))
  }

  /**
   * Removes the update source for a given collection ID.
   * @param id ID or _ref_id of the collection.
   */
  public removeUpdateSource(id: string) {
    this.updateSources.delete(id)
  }

  /**
   * Clears all saved update sources.
   */
  public clearAllUpdateSources() {
    this.updateSources.clear()
  }

  /**
   * Loads update sources from persisted state.
   * @param updateSources Object containing update sources to load.
   */
  public loadUpdateSourcesFromPersistedState(
    updateSources: Record<string, CollectionUpdateSource>
  ) {
    if (updateSources) {
      this.clearAllUpdateSources()

      Object.entries(updateSources).forEach(([id, source]) => {
        this.setUpdateSource(id, source)
      })
    }
  }

  /**
   * Returns update sources in a format suitable for persistence.
   */
  public persistableUpdateSources = computed(() => {
    const sources: Record<string, CollectionUpdateSource> = {}
    this.updateSources.forEach((source, id) => {
      sources[id] = source
    })
    return sources
  })
}
