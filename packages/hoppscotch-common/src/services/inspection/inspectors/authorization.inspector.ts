import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { Service } from "dioc"
import { computed, markRaw, Ref } from "vue"

import { getI18n } from "~/modules/i18n"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"
import { InterceptorService } from "~/services/interceptor.service"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { InspectionService, Inspector, InspectorResult } from ".."

/**
 * This inspector is responsible for inspecting the response of a request.
 * It checks if the response is successful and if it contains errors.
 *
 * NOTE: Initializing this service registers it as a inspector with the Inspection Service.
 */
export class AuthorizationInspectorService
  extends Service
  implements Inspector
{
  public static readonly ID = "AUTHORIZATION_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "authorization"

  private readonly inspection = this.bind(InspectionService)
  private readonly interceptorService = this.bind(InterceptorService)
  private readonly agentService = this.bind(AgentInterceptorService)

  override onServiceInit() {
    this.inspection.registerInspector(this)
  }

  getInspections(
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>
  ) {
    return computed(() => {
      const currentInterceptorIDValue =
        this.interceptorService.currentInterceptorID.value

      if (!currentInterceptorIDValue) {
        return []
      }

      const auth = req.value.auth

      const results: InspectorResult[] = []

      const isUnsupportedInterceptor =
        this.interceptorService.currentInterceptorID.value !==
        this.agentService.interceptorID

      if (auth.authType === "digest" && isUnsupportedInterceptor) {
        results.push({
          id: "url",
          icon: markRaw(IconAlertTriangle),
          text: {
            type: "text",
            text: this.t("authorization.digest.inspector_warning"),
          },
          severity: 2,
          isApplicable: true,
          locations: {
            type: "response",
          },
          doc: {
            text: this.t("action.learn_more"),
            link: "https://docs.hoppscotch.io/documentation/features/inspections",
          },
        })
      }

      return results
    })
  }
}
