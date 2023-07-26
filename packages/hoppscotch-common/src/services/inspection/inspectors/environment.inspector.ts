import { getI18n } from "~/modules/i18n"
import {
  InspectionService,
  Inspector,
  InspectorChecks,
  InspectorResult,
} from ".."
import { Service } from "dioc"
import { Ref, markRaw, ref } from "vue"
import IconPlusCircle from "~icons/lucide/plus-circle"
import { HoppRESTRequest } from "@hoppscotch/data"
import { getAggregateEnvs } from "~/newstore/environments"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

const HOPP_ENVIRONMENT_REGEX = /(<<[a-zA-Z0-9-_]+>>)/g

const isENVInString = (str: string) => {
  return HOPP_ENVIRONMENT_REGEX.test(str)
}

export class EnvironmentInspectorService extends Service implements Inspector {
  public static readonly ID = "ENVIRONMENT_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "environment"

  private readonly inspection = this.bind(InspectionService)

  constructor() {
    super()

    this.inspection.registerInspector(this)
  }

  // Helper function to validate environment variables
  private validateEnvironmentVariables = (
    target: any[],
    results: Ref<InspectorResult[]>,
    componentRefID: Ref<string>
  ) => {
    const env = getAggregateEnvs()
    const envKeys = env.map((e) => e.key)

    target.forEach((element, index) => {
      if (isENVInString(element)) {
        const extractedEnv = element.match(HOPP_ENVIRONMENT_REGEX)
        if (extractedEnv) {
          extractedEnv.forEach((exEnv: string) => {
            const formattedExEnv = exEnv.slice(2, -2)
            if (!envKeys.includes(formattedExEnv)) {
              results.value.push({
                id: "environment",
                componentRefID: componentRefID.value,
                text: {
                  type: "text",
                  text: "Environment variable " + exEnv + " not found",
                },
                icon: markRaw(IconPlusCircle),
                action: {
                  text: this.t("inspections.environment.add_environment"),
                  apply: () => {
                    console.log("apply")
                  },
                },
                severity: 3,
                isApplicable: true,
                index: index,
              })
            }
          })
        }
      }
    })
  }

  getInspectorFor(
    req: HoppRESTRequest,
    res: HoppRESTResponse,
    checks: InspectorChecks,
    componentRefID: Ref<string>
  ): InspectorResult[] {
    const results = ref<InspectorResult[]>([])

    const headers = req.headers

    const params = req.params

    if (checks.includes("url_environment_validation")) {
      this.validateEnvironmentVariables([req.endpoint], results, componentRefID)
    } else if (checks.includes("header_key_environment_validation")) {
      const headerKeys = Object.values(headers).map((header) => header.key)

      this.validateEnvironmentVariables(headerKeys, results, componentRefID)
    } else if (checks.includes("header_value_environment_validation")) {
      const headerValues = Object.values(headers).map((header) => header.value)

      this.validateEnvironmentVariables(headerValues, results, componentRefID)
    } else if (checks.includes("parameter_key_environment_validation")) {
      const paramsKeys = Object.values(params).map((param) => param.key)

      this.validateEnvironmentVariables(paramsKeys, results, componentRefID)
    } else if (checks.includes("parameter_value_environment_validation")) {
      const paramsValues = Object.values(params).map((param) => param.value)

      this.validateEnvironmentVariables(paramsValues, results, componentRefID)
    }

    return results.value
  }
}
