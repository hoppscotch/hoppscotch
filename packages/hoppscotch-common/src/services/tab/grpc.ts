import { getDefaultGRPCRequest } from "@hoppscotch/data"
import { Container } from "dioc"
import { computed } from "vue"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import type { PersistableTabState } from "."
import { TabService } from "./tab"

export class GRPCTabService extends TabService<HoppGRPCDocument> {
  public static readonly ID = "GRPC_TAB_SERVICE"

  constructor(c: Container) {
    super(c)
    this.tabMap.set("test", {
      id: "test",
      document: {
        request: getDefaultGRPCRequest(),
        isDirty: false,
        optionTabPreference: "body",
      },
    })
    this.watchCurrentTabID()
  }

  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)!
      return {
        tabID: tab.id,
        doc: { ...tab.document, response: null, error: null },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<HoppGRPCDocument> | null> {
    return getService(PersistenceService).getNullable(STORE_KEYS.GRPC_TABS)
  }

  public getDirtyTabsCount() {
    return [...this.tabMap.values()].filter((tab) => tab.document.isDirty)
      .length
  }
}
