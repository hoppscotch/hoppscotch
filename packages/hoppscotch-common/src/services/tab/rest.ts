import { Container } from "dioc"
import { computed } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTSaveContext, HoppTabDocument } from "~/helpers/rest/document"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { TabService } from "./tab"
import { HoppTab, PersistableTabState } from "."

export class RESTTabService extends TabService<HoppTabDocument> {
  public static readonly ID = "REST_TAB_SERVICE"

  // TODO: Moving this to `onServiceInit` breaks `persistableTabState`
  // Figure out how to fix this
  constructor(c: Container) {
    super(c)

    this.tabMap.set("test", {
      id: "test",
      document: {
        type: "request",
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

      if (tab.document.type === "example-response") {
        return {
          tabID: tab.id,
          doc: tab.document,
        }
      }

      if (tab.document.type === "test-runner") {
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            request: null,
            response: null,
          },
        }
      }

      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<HoppTabDocument> | null> {
    const persistenceService = getService(PersistenceService)
    const savedState = await persistenceService.getNullable<
      PersistableTabState<HoppTabDocument>
    >(STORE_KEYS.REST_TABS)
    return savedState
  }

  private matchesSaveContext(
    tab: HoppTab<HoppTabDocument>,
    ctx: HoppRESTSaveContext
  ) {
    if (tab.document.type === "test-runner") return false

    // For `team-collection` request id can be considered unique
    if (ctx?.originLocation === "team-collection") {
      return (
        tab.document.saveContext?.originLocation === "team-collection" &&
        tab.document.saveContext.requestID === ctx.requestID &&
        tab.document.saveContext.exampleID === ctx.exampleID
      )
    }

    const tabCtx = tab.document.saveContext

    if (tabCtx?.originLocation !== "user-collection") return false
    if (tabCtx.exampleID !== ctx?.exampleID) return false

    // A tab whose context predates ref ids is still identified by the request
    // it holds. Truthiness, not a null check: some creation paths store `""`,
    // which is not an identity.
    const tabRefID =
      tabCtx.requestRefID ||
      (tab.document.type === "request"
        ? tab.document.request._ref_id || tab.document.request.id
        : undefined)

    // A lookup that names its request is authoritative — a tab with a
    // different or missing identity is not that request, even at matching
    // coordinates, which may have been reused since the tab was bound.
    if (ctx?.requestRefID) {
      return tabRefID === ctx.requestRefID
    }

    // Position is all that's left when the lookup carries no identity
    return (
      tabCtx.folderPath === ctx?.folderPath &&
      tabCtx.requestIndex === ctx?.requestIndex
    )
  }

  /**
   * Returns every tab matching the save context — a request can be open in
   * more than one tab, and a write-back that skips one leaves it holding
   * stale content that its next save persists.
   */
  public getTabsRefWithSaveContext(ctx: HoppRESTSaveContext) {
    return Array.from(this.tabMap.values())
      .filter((tab) => this.matchesSaveContext(tab, ctx))
      .map((tab) => this.getTabRef(tab.id))
  }

  public getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
    for (const tab of this.tabMap.values()) {
      if (this.matchesSaveContext(tab, ctx)) return this.getTabRef(tab.id)
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
