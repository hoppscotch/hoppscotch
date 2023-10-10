import { isEqual } from "lodash-es"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { HoppGQLDocument, HoppGQLSaveContext } from "~/helpers/graphql/document"
import { TabService } from "./tab"
import { computed } from "vue"

export class GQLTabService extends TabService<HoppGQLDocument> {
  public static readonly ID = "GQL_TAB_SERVICE"

  constructor() {
    super()

    this.tabMap.set("test", {
      id: "test",
      document: {
        request: getDefaultGQLRequest(),
        isDirty: false,
        optionTabPreference: "query",
      },
    })

    this.watchCurrentTabID()
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key
      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  public getTabRefWithSaveContext(ctx: HoppGQLSaveContext) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (isEqual(ctx, tab.document.saveContext))
        return this.getTabRef(tab.id)
    }

    return null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }
}
