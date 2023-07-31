import { Service } from "dioc"
import {
  InspectionService,
  Inspector,
  InspectorChecks,
  InspectorResult,
} from ".."
import { getI18n } from "~/modules/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { Ref, markRaw, ref } from "vue"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

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
    checks: InspectorChecks,
    componentRefID: Ref<string>,
    res: HoppRESTResponse | undefined
  ): InspectorResult[] {
    const results = ref<InspectorResult[]>([])
    if (!res) return results.value

    console.log("response-errors", res)

    const isCheckContains = (checksArray: InspectorChecks) => {
      return checks.some((check) => checksArray.includes(check))
    }

    const hasErrors = res && (res.type !== "success" || res.statusCode !== 200)

    let text

    if (res.type === "network_fail") {
      text = this.t("inspections.response.network_error")
    } else if (res.type === "fail") {
      text = this.t("inspections.response.default_error")
    } else if (res.type === "success" && res.statusCode === 404) {
      text = this.t("inspections.response.404_error")
    } else if (res.type === "success" && res.statusCode === 401) {
      text = this.t("inspections.response.404_error")
    } else {
      text = this.t("inspections.response.success")
    }

    if (isCheckContains(["response_errors", "all_validation"]) && hasErrors) {
      results.value.push({
        id: "url",
        componentRefID: componentRefID.value,
        icon: markRaw(IconAlertTriangle),
        text: {
          type: "text",
          text: text,
        },
        severity: 2,
        isApplicable: true,
      })
    }

    console.log("response-errors", results.value)

    return results.value
  }
}
