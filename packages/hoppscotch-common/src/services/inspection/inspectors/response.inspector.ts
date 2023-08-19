import { Service } from "dioc"
import { InspectionService, Inspector, InspectorResult } from ".."
import { getI18n } from "~/modules/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { markRaw, ref } from "vue"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

/**
 * This inspector is responsible for inspecting the response of a request.
 * It checks if the response is successful and if it contains errors.
 *
 * NOTE: Initializing this service registers it as a inspector with the Inspection Service.
 */
export class ResponseInspectorService extends Service implements Inspector {
  public static readonly ID = "RESPONSE_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "response"

  private readonly inspection = this.bind(InspectionService)

  constructor() {
    super()

    this.inspection.registerInspector(this)
  }

  getInspectorFor(
    req: HoppRESTRequest,
    res: HoppRESTResponse | undefined
  ): InspectorResult[] {
    const results = ref<InspectorResult[]>([])
    if (!res) return results.value

    const hasErrors = res && (res.type !== "success" || res.statusCode !== 200)

    let text

    if (res.type === "network_fail") {
      text = this.t("inspections.response.network_error")
    } else if (res.type === "fail") {
      text = this.t("inspections.response.default_error")
    } else if (res.type === "success" && res.statusCode === 404) {
      text = this.t("inspections.response.404_error")
    } else if (res.type === "success" && res.statusCode === 401) {
      text = this.t("inspections.response.401_error")
    }

    if (hasErrors && text) {
      results.value.push({
        id: "url",
        icon: markRaw(IconAlertTriangle),
        text: {
          type: "text",
          text: text,
        },
        severity: 2,
        isApplicable: true,
        locations: {
          type: "response",
        },
        doc: {
          text: this.t("action.learn_more"),
          link: "https://docs.hoppscotch.io/",
        },
      })
    }

    return results.value
  }
}
