import { isEqual } from "lodash-es"
import { reactive } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTDocument, HoppRESTSaveContext } from "~/helpers/rest/document"
import { TabService } from "./tab"

export class RESTTabService extends TabService<HoppRESTDocument> {
  public static readonly ID = "REST_TAB_SERVICE"

  constructor() {
    super()

    this.tabMap = reactive(
      new Map([
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

    this.watchCurrentTabID()
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

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }
}
