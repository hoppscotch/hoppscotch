import { Container } from "dioc"
import { computed } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTSaveContext, HoppTabDocument } from "~/helpers/rest/document"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { TabService } from "./tab"
import { PersistableTabState } from "."

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
        // Run results are deliberately not persisted: the collection schema
        // strips `response`/`testResults`/counters so restored rows come back
        // empty anyway, and per-iteration trees can blow the localStorage
        // quota. The whole run is dropped; the tab restores ready to run.
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            // The debounced persist fires during a run, so a tab killed
            // mid-run would restore as "running". Normalize to "stopped",
            // never "idle" — an idle runner tab auto-runs on mount.
            status:
              tab.document.status === "running"
                ? ("stopped" as const)
                : tab.document.status,
            request: null,
            response: null,
            // Drop the run outright rather than half of it: an iteration
            // list without its result trees restores a summary over an
            // empty table.
            resultCollection: undefined,
            iterationResults: undefined,
            selectedIteration: 0,
            // Meaningless without the result rows it points into.
            selectedRequestPath: undefined,
            testRunnerMeta: {
              totalRequests: 0,
              completedRequests: 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              totalTime: 0,
            },
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

  public getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (tab.document.type === "test-runner") continue

      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID &&
          tab.document.saveContext.exampleID === ctx.exampleID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (
        tab.document.saveContext?.originLocation === "user-collection" &&
        tab.document.saveContext.folderPath === ctx?.folderPath &&
        tab.document.saveContext.requestIndex === ctx?.requestIndex &&
        tab.document.saveContext.exampleID === ctx?.exampleID &&
        (ctx?.requestRefID != null
          ? tab.document.saveContext.requestRefID === ctx.requestRefID
          : true)
      ) {
        return this.getTabRef(tab.id)
      }
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
