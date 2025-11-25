import { Service } from "dioc"
import { cloneDeep } from "lodash-es"
import { computed, reactive } from "vue"

/**
 * Defines a sort option.
 * For now, we only support sorting by name, ascending or descending.
 * In the future, we can add more sort options like date created, date modified, etc.
 */
export type CurrentSortOption = {
  sortBy: "name"
  sortOrder: "asc" | "desc"
}

/**
 * This service is used to store and manage current sort options of collections and folders.
 * This can be order by name, ascending, descending, etc.
 */
export class CurrentSortValuesService extends Service {
  public static readonly ID = "CURRENT_SORT_VALUES_SERVICE"

  /**
   * Map of sort options for collections and folders.
   * Key is the ID of the collection or folder.
   * Value is the sort option.
   */
  public currentSortOptions = reactive(new Map<string, CurrentSortOption>())

  /**
   * Gets the current sort option for a given collection or folder ID.
   * @param id ID of the collection or folder.
   * @returns Current sort option for the given ID, or `undefined` if not found.
   */
  public getSortOption(id: string): CurrentSortOption | undefined {
    return this.currentSortOptions.get(id)
  }

  /**
   * Sets the current sort option for a given collection or folder ID.
   * @param id ID of the collection or folder.
   * @param sortOption Sort option to set.
   */
  public setSortOption(id: string, sortOption: CurrentSortOption) {
    this.currentSortOptions.set(id, cloneDeep(sortOption))
  }

  /**
   * Removes the current sort option for a given collection or folder ID.
   * @param id ID of the collection or folder.
   */
  public removeSortOption(id: string) {
    this.currentSortOptions.delete(id)
  }

  /**
   * Clears all sort options.
   * This is useful when the user logs out or switches accounts.
   * */
  public clearAllSortOptions() {
    this.currentSortOptions.clear()
  }

  /**
   * Loads current sort values from persisted state.
   * @param currentSortOptions Object containing current sort options to load.
   */
  public loadCurrentSortValuesFromPersistedState(
    currentSortOptions: Record<string, CurrentSortOption>
  ) {
    if (currentSortOptions) {
      this.clearAllSortOptions()

      Object.entries(currentSortOptions).forEach(([id, sortOption]) => {
        this.setSortOption(id, sortOption)
      })
    }
  }

  /**
   * Returns current sort options in a format suitable for persistence.
   */
  public persistableCurrentSortValues = computed(() => {
    const currentSortOptions: Record<string, CurrentSortOption> = {}
    this.currentSortOptions.forEach((option, id) => {
      currentSortOptions[id] = option
    })
    return currentSortOptions
  })
}
