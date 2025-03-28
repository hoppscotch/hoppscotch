import { Service } from "dioc"
import { InspectionService, Inspector, InspectorResult } from ".."
import { getI18n } from "~/modules/i18n"
import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { markRaw, ref } from "vue"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconLoader from "~icons/lucide/loader"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { Ref } from "vue"
import { computed } from "vue"
import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import { useAIExperiments } from "~/composables/ai-experiments"
import AIDiagnosisInspector from "~/components/aiexperiments/AIDiagnosisInspector.vue"

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

  override onServiceInit() {
    this.inspection.registerInspector(this)
  }

  getInspections(
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>,
    res: Readonly<Ref<HoppRESTResponse | null | undefined>>
  ) {
    const { shouldEnableAIFeatures } = useAIExperiments()

    const aiResults: Ref<InspectorResult[]> = ref([])

    const isAIDiagnosisLoading = ref(false)

    const calculateAIResult = async () => {
      try {
        const diagnoseError =
          await platform.experiments?.aiExperiments?.diagnoseError

        if (!diagnoseError || !shouldEnableAIFeatures.value) {
          return
        }

        isAIDiagnosisLoading.value = true

        const aiResult = await diagnoseError(
          JSON.stringify(req.value),
          JSON.stringify(res.value)
        )

        if (E.isRight(aiResult)) {
          return {
            id: "ai_diagnosis",
            icon: markRaw(IconAlertTriangle),
            text: {
              type: "custom" as const,
              component: markRaw(AIDiagnosisInspector),
              componentProps: {
                diagnosis: aiResult.right.diagnosis,
                fix: aiResult.right.fix,
                traceID: aiResult.right.trace_id,
              },
            },
            severity: 2,
            isApplicable: true,
            locations: {
              type: "response" as const,
            },
          }
        }

        return {
          id: "ai_diagnosis_error",
          icon: markRaw(IconAlertTriangle),
          text: {
            type: "text" as const,
            text: "Failed to get AI diagnosis for now.",
          },
          severity: 1,
          isApplicable: true,
          locations: {
            type: "response" as const,
          },
        }
      } catch (error) {
        return {
          id: "ai_diagnosis_error",
          icon: markRaw(IconAlertTriangle),
          text: {
            type: "text" as const,
            text: "Failed to get AI diagnosis for now.",
          },
          severity: 1,
          isApplicable: true,
          locations: {
            type: "response" as const,
          },
        }
      } finally {
        isAIDiagnosisLoading.value = false
      }
    }

    calculateAIResult()
      .then((result) => {
        aiResults.value = result ? [result] : []
      })
      .catch(() => {})

    return computed(() => {
      const results: InspectorResult[] = []
      if (!res.value) return results

      const hasErrors =
        res && (res.value.type !== "success" || res.value.statusCode !== 200)

      let text: string | undefined = undefined

      if (res.value.type === "network_fail" && !navigator.onLine) {
        text = this.t("inspections.response.network_error")
      } else if (res.value.type === "fail") {
        text = this.t("inspections.response.default_error")
      } else if (res.value.type === "success" && res.value.statusCode === 404) {
        text = this.t("inspections.response.404_error")
      } else if (res.value.type === "success" && res.value.statusCode === 401) {
        text = this.t("inspections.response.401_error")
      }

      if (hasErrors && text) {
        results.push({
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
            link: "https://docs.hoppscotch.io/documentation/features/inspections",
          },
        })
      }

      if (isAIDiagnosisLoading.value) {
        results.push({
          id: "ai_diagnosis_loading",
          icon: markRaw(IconLoader),
          text: {
            type: "text",
            text: "AI is analyzing your request...",
          },
          severity: 1,
          isApplicable: true,
          locations: {
            type: "response",
          },
        })
      }

      return [
        ...results,
        // if the ai results are there, the computed will run and update the results
        ...aiResults.value,
      ]
    })
  }
}
