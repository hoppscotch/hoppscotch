import { isEqual } from "lodash-es"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { HoppGQLDocument, HoppGQLSaveContext } from "~/helpers/graphql/document"
import { TabService } from "./tab"
import { computed } from "vue"
import { Container } from "dioc"

export class GQLTabService extends TabService<HoppGQLDocument> {
  public static readonly ID = "GQL_TAB_SERVICE"

  // TODO: Moving this to `onServiceInit` breaks `persistableTabState`
  // Figure out how to fix this
  constructor(c: Container) {
    super(c)

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
      } else if (ctx?.originLocation === "user-collection") {
        if (isEqual(ctx, tab.document.saveContext)) {
          return this.getTabRef(tab.id)
        }
      } else if (
        ctx?.originLocation === "workspace-user-collection" &&
        tab.document.saveContext?.originLocation === "workspace-user-collection"
      ) {
        const requestHandle = tab.document.saveContext.requestHandle

        if (!ctx.requestHandle || !requestHandle) {
          continue
        }

        const tabRequestHandleRef = requestHandle.get()
        const requestHandleRef = ctx.requestHandle.get()

        if (
          requestHandleRef.value.type === "invalid" ||
          tabRequestHandleRef.value.type === "invalid"
        ) {
          continue
        }

        if (
          requestHandleRef.value.data.providerID ===
            tabRequestHandleRef.value.data.providerID &&
          requestHandleRef.value.data.workspaceID ===
            tabRequestHandleRef.value.data.workspaceID &&
          requestHandleRef.value.data.requestID ===
            tabRequestHandleRef.value.data.requestID
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
        const requestHandle = tab.document.saveContext.requestHandle

        if (requestHandle?.get().value.type === "invalid") {
          count++
        }
      }
    }

    return count
  }
}
