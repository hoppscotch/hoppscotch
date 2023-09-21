import { ComputedRef, WritableComputedRef } from "vue"

/**
 * Represents a tab in HoppScotch.
 * @template Doc The type of the document associated with the tab.
 */
export type HoppTab<Doc> = {
  /** The unique identifier of the tab. */
  id: string
  /** The document associated with the tab. */
  document: Doc
}

export type PersistableTabState<Doc> = {
  lastActiveTabID: string
  orderedDocs: Array<{
    tabID: string
    doc: Doc
  }>
}

/**
 * Represents a service for managing tabs with documents.
 * @template Doc - The type of document associated with each tab.
 */
export interface TabService<Doc> {
  /**
   * Gets the current active tab.
   */
  currentActiveTab: ComputedRef<HoppTab<Doc>>

  /**
   * Creates a new tab with the given document and sets it as the active tab.
   * @param document - The document to associate with the new tab.
   * @returns The newly created tab.
   */
  createNewTab(document: Doc): HoppTab<Doc>

  /**
   * Gets an array of all tabs.
   * @returns An array of all tabs.
   */
  getTabs(): HoppTab<Doc>[]

  /**
   * Gets the currently active tab.
   * @returns The active tab or null if no tab is active.
   */
  getActiveTab(): HoppTab<Doc> | null

  /**
   * Sets the active tab by its ID.
   * @param tabID - The ID of the tab to set as active.
   */
  setActiveTab(tabID: string): void

  /**
   * Loads tabs and their ordering from a persisted state.
   * @param data - The persisted tab state to load.
   */
  loadTabsFromPersistedState(data: PersistableTabState<Doc>): void

  /**
   * Gets a read-only computed reference to the active tabs.
   * @returns A computed reference to the active tabs.
   */
  getActiveTabs(): Readonly<ComputedRef<HoppTab<Doc>[]>>

  /**
   * Gets a computed reference to a specific tab by its ID.
   * @param tabID - The ID of the tab to retrieve.
   * @returns A computed reference to the specified tab.
   * @throws An error if the tab with the specified ID does not exist.
   */
  getTabRef(tabID: string): WritableComputedRef<HoppTab<Doc>>

  /**
   * Updates the properties of a tab.
   * @param tabUpdate - The updated tab object.
   */
  updateTab(tabUpdate: HoppTab<Doc>): void

  /**
   * Updates the ordering of tabs by moving a tab from one index to another.
   * @param fromIndex - The current index of the tab to move.
   * @param toIndex - The target index where the tab should be moved to.
   */
  updateTabOrdering(fromIndex: number, toIndex: number): void

  /**
   * Closes the tab with the specified ID.
   * @param tabID - The ID of the tab to close.
   */
  closeTab(tabID: string): void

  /**
   * Closes all tabs except the one with the specified ID.
   * @param tabID - The ID of the tab to keep open.
   */
  closeOtherTabs(tabID: string): void

  /**
   * Gets a computed reference to a persistable tab state.
   * @returns A computed reference to a persistable tab state object.
   */
  persistableTabState: ComputedRef<PersistableTabState<Doc>>

  /**
   * Gets computed references to tabs that match a specified condition.
   * @param func - A function that defines the condition for selecting tabs.
   * @returns An array of computed references to matching tabs.
   */
  getTabsRefTo(
    func: (tab: HoppTab<Doc>) => boolean
  ): WritableComputedRef<HoppTab<Doc>>[]
}
