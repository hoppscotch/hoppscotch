import { Service } from "dioc"

/**
 * This service is used to store and manage scroll positions for different tabs and views.
 * It keeps track of scroll positions using a key-value mapping where each key
 * is a combination of tab ID and view suffix (like json, raw, html, etc.).
 *
 * The scroll data is maintained in-memory and not persisted anywhere.
 */
export class ScrollService extends Service {
  public static readonly ID = "SCROLL_SERVICE"

  /**
   * Internal map to store scroll positions.
   * The key format is: `${tabId}::${suffix}` or any custom key.
   */
  private scrollMap = new Map<string, number>()

  /**
   * Set the scroll position for a specific tab and view.
   * @param tabId ID of the tab (e.g., request ID or panel ID)
   * @param suffix View identifier (e.g., 'json', 'html', etc.)
   * @param position Scroll position to store
   */
  public setScroll(tabId: string, suffix: string, position: number) {
    const key = `${tabId}::${suffix}`
    this.scrollMap.set(key, position)
  }

  /**
   * Get the scroll position for a specific tab and view.
   * @param tabId ID of the tab
   * @param suffix View identifier
   * @returns Scroll position if available, otherwise undefined
   */
  public getScroll(tabId: string, suffix: string): number | undefined {
    const key = `${tabId}::${suffix}`
    return this.scrollMap.get(key)
  }

  /**
   * Clear scroll positions for all suffixes (views) related to a given tab.
   * @param tabId ID of the tab
   */
  public cleanupScrollForTab(tabId: string) {
    const suffixes = ["json", "raw", "html", "xml", "preview"]
    for (const suffix of suffixes) {
      const key = `${tabId}::${suffix}`
      this.scrollMap.delete(key)
    }
  }

  /**
   * Clear all scroll positions from the service.
   */
  public cleanupAllScroll() {
    this.scrollMap.clear()
  }

  /**
   * Set scroll position directly by key (without tabId and suffix).
   * Useful for custom or global use cases.
   * @param key Unique identifier for scroll state
   * @param position Scroll position to store
   */
  public setScrollForKey(key: string, position: number) {
    this.scrollMap.set(key, position)
  }

  /**
   * Get scroll position by key.
   * @param key Unique identifier for scroll state
   * @returns Scroll position if available, otherwise undefined
   */
  public getScrollForKey(key: string): number | undefined {
    return this.scrollMap.get(key)
  }
}
