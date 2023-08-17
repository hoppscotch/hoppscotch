import { Service } from "dioc"
import { InspectionService, Inspector, InspectorResult } from ".."
import { getI18n } from "~/modules/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { computed, markRaw, ref } from "vue"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { useReadonlyStream } from "~/composables/stream"
import { extensionStatus$ } from "~/newstore/HoppExtension"
import { useSetting } from "~/composables/settings"
import { applySetting, toggleSetting } from "~/newstore/settings"

/**
 * This inspector is responsible for inspecting the URL of a request.
 * It checks if the URL contains localhost and if the extension is installed.
 * It also provides an action to enable the extension.
 *
 * NOTE: Initializing this service registers it as a inspector with the Inspection Service.
 */
export class URLInspectorService extends Service implements Inspector {
  public static readonly ID = "URL_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "url"

  private readonly inspection = this.bind(InspectionService)

  constructor() {
    super()

    this.inspection.registerInspector(this)
  }

  getInspectorFor(req: HoppRESTRequest): InspectorResult[] {
    const PROXY_ENABLED = useSetting("PROXY_ENABLED")

    const currentExtensionStatus = useReadonlyStream(extensionStatus$, null)

    const isExtensionInstalled = computed(() => {
      return currentExtensionStatus.value === "available"
    })
    const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")

    const results = ref<InspectorResult[]>([])

    const url = req.endpoint

    const isContainLocalhost = url.includes("localhost")

    if (
      isContainLocalhost &&
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
        icon: markRaw(IconAlertTriangle),
        text: {
          type: "text",
          text: text,
        },
        action: {
          text: this.t("inspections.url.extention_enable_action"),
          apply: () => {
            applySetting("EXTENSIONS_ENABLED", true)
            if (PROXY_ENABLED.value) toggleSetting("PROXY_ENABLED")
          },
        },
        severity: 2,
        isApplicable: true,
        locations: {
          type: "url",
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
