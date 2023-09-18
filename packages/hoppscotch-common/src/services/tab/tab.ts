import { v4 as uuidV4 } from "uuid"
import { isEqual } from "lodash-es"
import {
  reactive,
  computed,
  ref,
  shallowReadonly,
  ComputedRef,
  watch,
} from "vue"
import { refWithControl } from "@vueuse/core"
import { platform } from "~/platform"
import { nextTick } from "vue"
import { HoppRESTDocument, HoppRESTSaveContext } from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { Service } from "dioc"

export type HoppRESTTab = {
  id: string
  document: HoppRESTDocument
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
}

export type PersistableRESTTabState = {
  lastActiveTabID: string
  orderedDocs: Array<{
    tabID: string
    doc: HoppRESTDocument
  }>
}

export class RESTTabService extends Service {
  public static readonly ID = "REST_TAB_SERVICE"

  constructor() {
    super()

    this.watchCurrentTabID()
  }

  private tabMap = reactive(
    new Map<string, HoppRESTTab>([
      [
        "test",
        {
          id: "test",
          document: {
            request: getDefaultRESTRequest(),
            isDirty: false,
          },
        },
      ],
    ])
  )

  private tabOrdering = ref<string[]>(["test"])

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

  private watchCurrentTabID() {
    watch(
      this.tabOrdering,
      (newOrdering) => {
        if (
          !this.currentTabID.value ||
          !newOrdering.includes(this.currentTabID.value)
        ) {
          this.currentTabID.value = newOrdering[newOrdering.length - 1] // newOrdering should always be non-empty
        }
      },
      { deep: true }
    )
  }

  public createTab(document: HoppRESTDocument): HoppRESTTab {
    const id = this.generateNewTabID()

    const tab: HoppRESTTab = { id, document }

    this.tabMap.set(id, tab)
    this.tabOrdering.value.push(id)

    this.currentTabID.value = id

    platform.analytics?.logEvent({
      type: "HOPP_REST_NEW_TAB_OPENED",
    })

    return tab
  }

  public getTabs(): HoppRESTTab[] {
    return Array.from(this.tabMap.values())
  }

  public getActiveTab(): HoppRESTTab | null {
    if (!this.currentTabID.value) {
      return null
    }
    return this.tabMap.get(this.currentTabID.value) || null
  }

  public setActiveTab(tabID: string): void {
    this.currentTabID.value = tabID
  }

  public saveTab(tab: HoppRESTTab, context: HoppRESTSaveContext): void {
    // Save the tab using the provided context
  }

  public async sendRequest(tab: HoppRESTTab): Promise<void> {
    // Send the request and update the tab's response and test results
  }

  public loadTabsFromPersistedState(data: PersistableRESTTabState): void {
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

      this.currentTabID.value = data.lastActiveTabID
    }
  }

  public getActiveTabs(): Readonly<ComputedRef<HoppRESTTab[]>> {
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

  public updateTab(tabUpdate: HoppRESTTab) {
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

    this.tabOrdering.value.splice(this.tabOrdering.value.indexOf(tabID), 1)

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

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }

  public getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (ctx && ctx.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (isEqual(ctx, tab.document.saveContext)) {
        return this.getTabRef(tab.id)
      }
    }

    return null
  }

  public getTabsRefTo(func: (tab: HoppRESTTab) => boolean) {
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
