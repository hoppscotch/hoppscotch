import { Service } from "dioc"
import { InspectionService, Inspector, InspectorResult } from ".."
import { computed, Ref } from "vue"
import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"

import IconAlertCircle from "~icons/lucide/alert-circle"
import { InterceptorService } from "~/services/interceptor.service"
import { getI18n } from "~/modules/i18n"

export class InterceptorsInspectorService extends Service implements Inspector {
  public static readonly ID = "INTERCEPTORS_INSPECTOR_SERVICE"

  inspectorID = "interceptors"

  private t = getI18n()

  private readonly inspection = this.bind(InspectionService)
  private readonly interceptors = this.bind(InterceptorService)

  onServiceInit() {
    this.inspection.registerInspector(this)
  }

  getInspections(
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>
  ) {
    return computed((): InspectorResult[] => {
      const isBinaryBody =
        req.value.body.contentType === "application/octet-stream"

      // TODO: define the supported capabilities in the interceptor
      const isAgent = this.interceptors.currentInterceptorID.value === "agent"

      if (isBinaryBody && isAgent) {
        const inspectionResultPayload: Omit<
          InspectorResult,
          "locations" | "id"
        > = {
          isApplicable: true,
          icon: IconAlertCircle,
          severity: 2,
          text: {
            type: "text",
            text: this.t(
              "inspections.requestBody.agent_doesnt_support_binary_body"
            ),
          },
        }

        return [
          // TODO: locations should have been an array, so i didnt have to do this
          {
            ...inspectionResultPayload,
            locations: {
              type: "body-content-type-header",
            },
            id: "interceptors-inspector-binary-agent-body-content-type-header",
          },
          {
            ...inspectionResultPayload,
            locations: {
              type: "url",
            },
            id: "interceptors-inspector-binary-agent-url",
          },
        ]
      }

      return []
    })
  }
}
