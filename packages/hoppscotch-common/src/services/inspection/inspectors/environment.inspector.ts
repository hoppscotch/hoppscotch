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
import { invokeAction } from "~/helpers/actions"

const HOPP_ENVIRONMENT_REGEX = /(<<[a-zA-Z0-9-_]+>>)/g

const isENVInString = (str: string) => {
  return HOPP_ENVIRONMENT_REGEX.test(str)
}

/**
 * This inspector is responsible for inspecting the environment variables of a input.
 * It checks if the environment variables are defined in the environment.
 * It also provides an action to add the environment variable.
 */
export class EnvironmentInspectorService extends Service implements Inspector {
  public static readonly ID = "ENVIRONMENT_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "environment"

  private readonly inspection = this.bind(InspectionService)

  constructor() {
    super()

    this.inspection.registerInspector(this)
  }

  /**
   * Validates the environment variables in the target array
   * @param target The target array to validate
   * @param results The results array to push the results to
   * @param componentRefID The component reference ID
   * @returns The results array
   */
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
                    invokeAction("modals.environment.add", {
                      envName: "test",
                      variableName: formattedExEnv,
                    })
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

  /**
   * Returns the inspector results for the request
   * It checks if any env is used in the request ie, url, headers, params
   * and checks if the env is defined in the environment using the validateEnvironmentVariables function
   * @param req The request to inspect
   * @param checks The checks to perform
   * @param componentRefID The component reference ID
   * @returns The inspector results
   */
  getInspectorFor(
    req: HoppRESTRequest,
    checks: InspectorChecks,
    componentRefID: Ref<string>
  ): InspectorResult[] {
    const results = ref<InspectorResult[]>([])

    const headers = req.headers

    const params = req.params

    const isCheckContains = (checksArray: InspectorChecks) => {
      return checks.some((check) => checksArray.includes(check))
    }

    if (
      checks.includes("url_environment_validation") &&
      checks.includes("all_validation")
    ) {
      this.validateEnvironmentVariables([req.endpoint], results, componentRefID)
    }
    if (
      isCheckContains(["header_key_environment_validation", "all_validation"])
    ) {
      const headerKeys = Object.values(headers).map((header) => header.key)

      this.validateEnvironmentVariables(headerKeys, results, componentRefID)
    }
    if (
      isCheckContains(["header_value_environment_validation", "all_validation"])
    ) {
      const headerValues = Object.values(headers).map((header) => header.value)

      this.validateEnvironmentVariables(headerValues, results, componentRefID)
    }
    if (
      isCheckContains([
        "parameter_key_environment_validation",
        "all_validation",
      ])
    ) {
      const paramsKeys = Object.values(params).map((param) => param.key)

      this.validateEnvironmentVariables(paramsKeys, results, componentRefID)
    }
    if (
      isCheckContains([
        "parameter_value_environment_validation",
        "all_validation",
      ])
    ) {
      const paramsValues = Object.values(params).map((param) => param.value)

      this.validateEnvironmentVariables(paramsValues, results, componentRefID)
    }

    return results.value
  }
}
