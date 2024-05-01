import { isEqual } from "lodash-es"
import { computed } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTDocument, HoppRESTSaveContext } from "~/helpers/rest/document"
import { TabService } from "./tab"
import { HandleRef } from "../new-workspace/handle"
import { WorkspaceRequest } from "../new-workspace/workspace"

export class RESTTabService extends TabService<HoppRESTDocument> {
  public static readonly ID = "REST_TAB_SERVICE"

  constructor() {
    super()

    this.tabMap.set("test", {
      id: "test",
      document: {
        request: getDefaultRESTRequest(),
        isDirty: false,
        optionTabPreference: "params",
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
          ...this.getPersistedDocument(tab.document),
          response: null,
        },
      }
    }),
  }))

  public getTabRefWithSaveContext(ctx: Partial<HoppRESTSaveContext>) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (ctx?.originLocation === "user-collection") {
        if (isEqual(ctx, tab.document.saveContext)) {
          return this.getTabRef(tab.id)
        }
      } else if (
        ctx?.originLocation === "workspace-user-collection" &&
        tab.document.saveContext?.originLocation === "workspace-user-collection"
      ) {
        if (
          isEqual(
            ctx.requestHandle?.value,

            // TODO: Investigate why requestHandle gets unwrapped
            tab.document.saveContext.requestHandle as
              | HandleRef<WorkspaceRequest>["value"]
              | undefined
          )
        ) {
          return this.getTabRef(tab.id)
        }
      }
    }

    return null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) {
        count++
        continue
      }

      if (
        tab.document.saveContext?.originLocation === "workspace-user-collection"
      ) {
        const requestHandle = tab.document.saveContext.requestHandle as
          | HandleRef<WorkspaceRequest>["value"]
          | undefined

        if (requestHandle?.type === "invalid") {
          count++
        }
      }
    }

    return count
  }
}
