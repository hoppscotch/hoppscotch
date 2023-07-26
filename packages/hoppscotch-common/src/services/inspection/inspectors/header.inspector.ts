import { Service } from "dioc"
import {
  Checks,
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

export class HeaderInspectorService extends Service implements Inspector {
  public static readonly ID = "Header_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "header"

  private readonly inspection = this.bind(InspectionService)

  constructor() {
    super()

    this.inspection.registerInspector(this)
  }

  getInspectorFor(
    req: HoppRESTRequest,
    res: HoppRESTResponse,
    checks: InspectorChecks,
    componentRefID: Ref<string>
  ): InspectorResult[] {
    const results = ref<InspectorResult[]>([])

    const cookiesCheck = (headerKey: string) => {
      const cookieKeywords = ["Cookie", "Set-Cookie", "Cookie2", "Set-Cookie2"]

      return cookieKeywords.includes(headerKey)
    }

    const isCheckContains = (check: Checks) => {
      return checks.includes(check)
    }

    const headers = req.headers

    const headerKeys = Object.values(headers).map((header) => header.key)

    const isContainCookies = headerKeys.includes("Cookie")

    if (isCheckContains("header_validation") && isContainCookies) {
      headerKeys.forEach((headerKey, index) => {
        if (cookiesCheck(headerKey)) {
          results.value.push({
            id: "header",
            componentRefID: componentRefID.value,
            icon: markRaw(IconAlertTriangle),
            text: {
              type: "text",
              text: this.t("inspections.header.cookie"),
            },
            // action: {
            //   text: this.t("context_menu.set_environment_variable"),
            //   apply: () => {
            //     console.log("apply")
            //   },
            // },
            severity: 3,
            isApplicable: true,
            index: index,
          })
        }
      })
    }

    return results.value
  }
}
