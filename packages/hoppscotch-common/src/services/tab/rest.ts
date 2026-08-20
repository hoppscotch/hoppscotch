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

    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      tab.document.saveContext.folderPath === ctx?.folderPath &&
      tab.document.saveContext.requestIndex === ctx?.requestIndex &&
      tab.document.saveContext.exampleID === ctx?.exampleID &&
      (ctx?.requestRefID != null
        ? tab.document.saveContext.requestRefID === ctx.requestRefID
        : true)
    )
  }

  /**
   * Returns every tab matching the save context, not just the first.
   *
   * A request can end up open in more than one tab whenever two tabs were
   * created with save contexts that don't match each other — most easily when
   * one of them omits `requestRefID`, since a lookup that supplies one won't
   * find it. Callers writing back into a tab need all of the matches: any they
   * skip keeps stale content and overwrites the write on its next save.
   */
  public getTabsRefWithSaveContext(ctx: HoppRESTSaveContext) {
    return Array.from(this.tabMap.values())
      .filter((tab) => this.matchesSaveContext(tab, ctx))
      .map((tab) => this.getTabRef(tab.id))
  }

  public getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
    return this.getTabsRefWithSaveContext(ctx)[0] ?? null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }
}
