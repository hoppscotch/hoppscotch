import { Service } from "dioc"
import {
  Check,
  InspectionService,
  Inspector,
  InspectorChecks,
  InspectorResult,
} from ".."
import { getI18n } from "~/modules/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { Ref, computed, markRaw, ref } from "vue"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useReadonlyStream } from "~/composables/stream"
import { extensionStatus$ } from "~/newstore/HoppExtension"
import { useSetting } from "~/composables/settings"
import { applySetting, toggleSetting } from "~/newstore/settings"

export class URLInspectorService extends Service implements Inspector {
  public static readonly ID = "URL_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "url"

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
    const PROXY_ENABLED = useSetting("PROXY_ENABLED")

    const currentExtensionStatus = useReadonlyStream(extensionStatus$, null)

    const isExtensionInstalled = computed(() => {
      return currentExtensionStatus.value === "available"
    })
    const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")

    const results = ref<InspectorResult[]>([])

    const isCheckContains = (check: Check) => {
      return checks.includes(check)
    }

    const url = req.endpoint

    const isContainLocalhost = url.includes("localhost")

    if (
      isContainLocalhost &&
      isCheckContains("url_validation") &&
      (!EXTENSIONS_ENABLED.value || !isExtensionInstalled.value)
    ) {
      let text

      if (!isExtensionInstalled.value) {
        if (currentExtensionStatus.value === "unknown-origin") {
          text = this.t("inspections.url.extension_unknown_origin")
        } else {
          text = this.t("inspections.url.extension_not_installed")
        }
      } else if (!EXTENSIONS_ENABLED.value) {
        text = this.t("inspections.url.extention_not_enabled")
      } else {
        text = this.t("inspections.url.localhost")
      }

      results.value.push({
        id: "url",
        componentRefID: componentRefID.value,
        icon: markRaw(IconAlertTriangle),
        text: {
          type: "text",
          text: text,
        },
        action: {
          text: this.t("inspections.url.extention_enable_action"),
          apply: () => {
            console.log("apply")
            applySetting("EXTENSIONS_ENABLED", true)
            if (PROXY_ENABLED.value) toggleSetting("PROXY_ENABLED")
          },
        },
        severity: 2,
        isApplicable: true,
      })
    }

    return results.value
  }
}
