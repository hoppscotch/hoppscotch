import { refWithControl } from "@vueuse/core"
import { Service } from "dioc"
import { v4 as uuidV4 } from "uuid"
import {
  ComputedRef,
  computed,
  nextTick,
  reactive,
  ref,
  shallowReadonly,
  watch,
} from "vue"
import {
  HoppTab,
  PersistableTabState,
  TabService as TabServiceInterface,
} from "."

export abstract class TabService<Doc>
  extends Service
  implements TabServiceInterface<Doc>
{
  protected tabMap = reactive(new Map<string, HoppTab<Doc>>()) as Map<
    string,
    HoppTab<Doc>
  > // TODO: The implicit cast is necessary as the reactive unwraps the inner types, creating weird type errors, this needs to be refactored and removed
  protected tabOrdering = ref<string[]>(["test"])
  protected recentlyClosedTabs: Array<{ tab: HoppTab<Doc>; index: number }> = []
  protected readonly MAX_CLOSED_TABS_HISTORY = 10

  public currentTabID = refWithControl("test", {
    onBeforeChange: (newTabID) => {
      if (!newTabID || !this.tabMap.has(newTabID)) {
        console.warn(
          `Tried to set current tab id to an invalid value. (value: ${newTabID})`
        )

        // Don't allow change
        return false
      }
    },
  })

  public currentActiveTab = computed(
    () => this.tabMap.get(this.currentTabID.value)!
  ) // Guaranteed to not be undefined

  protected watchCurrentTabID() {
    watch(
      this.tabOrdering,
      (newOrdering) => {
        if (
          !this.currentTabID.value ||
          !newOrdering.includes(this.currentTabID.value)
        ) {
          this.setActiveTab(newOrdering[newOrdering.length - 1]) // newOrdering should always be non-empty
        }
      },
      { deep: true }
    )
  }

  public async init() {
    const persistedState = await this.loadPersistedState()
    if (persistedState) {
      this.loadTabsFromPersistedState(persistedState)
    }
  }

  protected abstract loadPersistedState(): Promise<PersistableTabState<Doc> | null>

  public createNewTab(document: Doc, switchToIt = true): HoppTab<Doc> {
    const id = this.generateNewTabID()

    const tab: HoppTab<Doc> = { id, document }

    this.tabMap.set(id, tab)
    this.tabOrdering.value.push(id)

    if (switchToIt) {
      this.setActiveTab(id)
    }

    return tab
  }

  public getTabs(): HoppTab<Doc>[] {
    return Array.from(this.tabMap.values())
  }

  public getActiveTab(): HoppTab<Doc> | null {
    return this.tabMap.get(this.currentTabID.value) ?? null
  }

  public setActiveTab(tabID: string): void {
    this.currentTabID.value = tabID
  }

  public loadTabsFromPersistedState(data: PersistableTabState<Doc>): void {
    if (data) {
      this.tabMap.clear()
      this.tabOrdering.value = []

      for (const doc of data.orderedDocs) {
        this.tabMap.set(doc.tabID, {
          id: doc.tabID,
          document: doc.doc,
        })

        this.tabOrdering.value.push(doc.tabID)
      }

      this.setActiveTab(data.lastActiveTabID)
    }
  }

  public getActiveTabs(): Readonly<ComputedRef<HoppTab<Doc>[]>> {
    return shallowReadonly(
      computed(() => this.tabOrdering.value.map((x) => this.tabMap.get(x)!))
    )
  }

  public getTabRef(tabID: string) {
    return computed({
      get: () => {
        const result = this.tabMap.get(tabID)

        if (result === undefined) throw new Error(`Invalid tab id: ${tabID}`)

        return result
      },
      set: (value) => {
        return this.tabMap.set(tabID, value)
      },
    })
  }

  public updateTab(tabUpdate: HoppTab<Doc>) {
    if (!this.tabMap.has(tabUpdate.id)) {
      console.warn(
        `Cannot update tab as tab with that tab id does not exist (id: ${tabUpdate.id})`
      )
    }

    this.tabMap.set(tabUpdate.id, tabUpdate)
  }

  public updateTabOrdering(fromIndex: number, toIndex: number) {
    this.tabOrdering.value.splice(
      toIndex,
      0,
      this.tabOrdering.value.splice(fromIndex, 1)[0]
    )

    return this.tabOrdering.value
  }

  public closeTab(tabID: string) {
    if (!this.tabMap.has(tabID)) {
      console.warn(
        `Tried to close a tab which does not exist (tab id: ${tabID})`
      )
      return
    }

    if (this.tabOrdering.value.length === 1) {
      console.warn(
        `Tried to close the only tab open, which is not allowed. (tab id: ${tabID})`
      )
      return
    }

    const tabIndex = this.tabOrdering.value.indexOf(tabID)
    const tab = this.tabMap.get(tabID)!

    this.addToRecentlyClosedTabs(tab, tabIndex)

    this.tabOrdering.value.splice(tabIndex, 1)

    nextTick(() => {
      this.tabMap.delete(tabID)
    })
  }

  public closeOtherTabs(tabID: string) {
    if (!this.tabMap.has(tabID)) {
      console.warn(
        `The tab to close other tabs does not exist (tab id: ${tabID})`
      )
      return
    }

    this.tabOrdering.value = [tabID]

    this.tabMap.forEach((_, id) => {
      if (id !== tabID) this.tabMap.delete(id)
    })

    this.currentTabID.value = tabID
  }

  public goToNextTab(): void {
    const currentIndex = this.tabOrdering.value.indexOf(this.currentTabID.value)
    const nextIndex = (currentIndex + 1) % this.tabOrdering.value.length
    const nextTabID = this.tabOrdering.value[nextIndex]
    this.setActiveTab(nextTabID)
  }

  public goToPreviousTab(): void {
    const currentIndex = this.tabOrdering.value.indexOf(this.currentTabID.value)
    const prevIndex =
      currentIndex === 0 ? this.tabOrdering.value.length - 1 : currentIndex - 1
    const prevTabID = this.tabOrdering.value[prevIndex]
    this.setActiveTab(prevTabID)
  }

  // NOTE: Currently inert, plumbing is done, some platform issues around shortcuts, WIP for future.
  public goToTabByIndex(index: number): void {
    if (index >= 1 && index <= this.tabOrdering.value.length) {
      const tabID = this.tabOrdering.value[index - 1]
      this.setActiveTab(tabID)
    }
  }

  public goToFirstTab(): void {
    const firstTabID = this.tabOrdering.value[0]
    this.setActiveTab(firstTabID)
  }

  public goToLastTab(): void {
    const lastTabID = this.tabOrdering.value[this.tabOrdering.value.length - 1]
    this.setActiveTab(lastTabID)
  }

  public reopenClosedTab(): boolean {
    if (this.recentlyClosedTabs.length === 0) {
      return false
    }

    const { tab, index } = this.recentlyClosedTabs.pop()!

    this.tabMap.set(tab.id, tab)

    const insertIndex = Math.min(index, this.tabOrdering.value.length)
    this.tabOrdering.value.splice(insertIndex, 0, tab.id)

    this.setActiveTab(tab.id)

    return true
  }

  private addToRecentlyClosedTabs(tab: HoppTab<Doc>, index: number): void {
    this.recentlyClosedTabs.push({ tab, index })

    if (this.recentlyClosedTabs.length > this.MAX_CLOSED_TABS_HISTORY) {
      this.recentlyClosedTabs.shift()
    }
  }

  public persistableTabState = computed<PersistableTabState<Doc>>(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key
      return {
        tabID: tab.id,
        doc: tab.document,
      }
    }),
  }))

  public getTabsRefTo(func: (tab: HoppTab<Doc>) => boolean) {
    return Array.from(this.tabMap.values())
      .filter(func)
      .map((tab) => this.getTabRef(tab.id))
  }

  private generateNewTabID() {
    while (true) {
      const id = uuidV4()

      if (!this.tabMap.has(id)) return id
    }
  }
}
