import { v4 as uuidV4 } from "uuid"
import { isEqual } from "lodash-es"
import { reactive, watch, computed, ref, shallowReadonly } from "vue"
import { HoppRESTDocument, HoppRESTSaveContext } from "./document"
import { refWithControl } from "@vueuse/core"
import { HoppRESTResponse } from "../types/HoppRESTResponse"
import { getDefaultRESTRequest } from "./default"
import { HoppTestResult } from "../types/HoppTestResult"
import { platform } from "~/platform"

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

export const currentTabID = refWithControl("test", {
  onBeforeChange(newTabID) {
    if (!newTabID || !tabMap.has(newTabID)) {
      console.warn(
        `Tried to set current tab id to an invalid value. (value: ${newTabID})`
      )

      // Don't allow change
      return false
    }
  },
})

const tabMap = reactive(
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
const tabOrdering = ref<string[]>(["test"])

watch(
  tabOrdering,
  (newOrdering) => {
    if (!currentTabID.value || !newOrdering.includes(currentTabID.value)) {
      currentTabID.value = newOrdering[newOrdering.length - 1] // newOrdering should always be non-empty
    }
  },
  { deep: true }
)

export const persistableTabState = computed<PersistableRESTTabState>(() => ({
  lastActiveTabID: currentTabID.value,
  orderedDocs: tabOrdering.value.map((tabID) => {
    const tab = tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key
    return {
      tabID: tab.id,
      doc: tab.document,
    }
  }),
}))

export const currentActiveTab = computed(() => tabMap.get(currentTabID.value)!) // Guaranteed to not be undefined

// TODO: Mark this unknown and do validations
export function loadTabsFromPersistedState(data: PersistableRESTTabState) {
  if (data) {
    tabMap.clear()
    tabOrdering.value = []

    for (const doc of data.orderedDocs) {
      tabMap.set(doc.tabID, {
        id: doc.tabID,
        document: doc.doc,
      })

      tabOrdering.value.push(doc.tabID)
    }

    currentTabID.value = data.lastActiveTabID
  }
}

/**
 * Returns all the active Tab IDs in order
 */
export function getActiveTabs() {
  return shallowReadonly(
    computed(() => tabOrdering.value.map((x) => tabMap.get(x)!))
  )
}

export function getTabRef(tabID: string) {
  return computed({
    get() {
      const result = tabMap.get(tabID)

      if (result === undefined) throw new Error(`Invalid tab id: ${tabID}`)

      return result
    },
    set(value) {
      return tabMap.set(tabID, value)
    },
  })
}

function generateNewTabID() {
  while (true) {
    const id = uuidV4()

    if (!tabMap.has(id)) return id
  }
}

export function updateTab(tabUpdate: HoppRESTTab) {
  if (!tabMap.has(tabUpdate.id)) {
    console.warn(
      `Cannot update tab as tab with that tab id does not exist (id: ${tabUpdate.id})`
    )
  }

  tabMap.set(tabUpdate.id, tabUpdate)
}

export function createNewTab(document: HoppRESTDocument, switchToIt = true) {
  const id = generateNewTabID()

  const tab: HoppRESTTab = { id, document }

  tabMap.set(id, tab)
  tabOrdering.value.push(id)

  if (switchToIt) {
    currentTabID.value = id
  }

  platform.analytics?.logEvent({
    type: "HOPP_REST_NEW_TAB_OPENED",
  })

  return tab
}

export function updateTabOrdering(fromIndex: number, toIndex: number) {
  tabOrdering.value.splice(
    toIndex,
    0,
    tabOrdering.value.splice(fromIndex, 1)[0]
  )
}

export function closeTab(tabID: string) {
  if (!tabMap.has(tabID)) {
    console.warn(`Tried to close a tab which does not exist (tab id: ${tabID})`)
    return
  }

  if (tabOrdering.value.length === 1) {
    console.warn(
      `Tried to close the only tab open, which is not allowed. (tab id: ${tabID})`
    )
    return
  }

  tabOrdering.value.splice(tabOrdering.value.indexOf(tabID), 1)

  tabMap.delete(tabID)
}

export function closeOtherTabs(tabID: string) {
  if (!tabMap.has(tabID)) {
    console.warn(
      `The tab to close other tabs does not exist (tab id: ${tabID})`
    )
    return
  }

  tabOrdering.value = [tabID]

  tabMap.forEach((_, id) => {
    if (id !== tabID) tabMap.delete(id)
  })

  currentTabID.value = tabID
}

export function getDirtyTabsCount() {
  let count = 0

  for (const tab of tabMap.values()) {
    if (tab.document.isDirty) count++
  }

  return count
}

export function getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
  for (const tab of tabMap.values()) {
    // For `team-collection` request id can be considered unique
    if (ctx && ctx.originLocation === "team-collection") {
      if (
        tab.document.saveContext?.originLocation === "team-collection" &&
        tab.document.saveContext.requestID === ctx.requestID
      ) {
        return getTabRef(tab.id)
      }
    } else if (isEqual(ctx, tab.document.saveContext)) return getTabRef(tab.id)
  }

  return null
}

export function getTabsRefTo(func: (tab: HoppRESTTab) => boolean) {
  return Array.from(tabMap.values())
    .filter(func)
    .map((tab) => getTabRef(tab.id))
}
