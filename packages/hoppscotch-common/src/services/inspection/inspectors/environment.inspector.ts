import { getI18n } from "~/modules/i18n"
import {
  InspectionService,
  Inspector,
  InspectorLocation,
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
 *
 * NOTE: Initializing this service registers it as a inspector with the Inspection Service.
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
   * @param locations The location where results are to be displayed
   * @returns The results array
   */
  private validateEnvironmentVariables = (
    target: any[],
    results: Ref<InspectorResult[]>,
    locations: InspectorLocation
  ) => {
    const env = getAggregateEnvs()
    const envKeys = env.map((e) => e.key)

    target.forEach((element, index) => {
      if (isENVInString(element)) {
        const extractedEnv = element.match(HOPP_ENVIRONMENT_REGEX)

        if (extractedEnv) {
          extractedEnv.forEach((exEnv: string) => {
            const formattedExEnv = exEnv.slice(2, -2)
            let itemLocation: InspectorLocation
            if (locations.type === "header") {
              itemLocation = {
                type: "header",
                position: locations.position,
                index: index,
                key: element,
              }
            } else if (locations.type === "parameter") {
              itemLocation = {
                type: "parameter",
                position: locations.position,
                index: index,
                key: element,
              }
            } else {
              itemLocation = {
                type: "url",
              }
            }
            if (!envKeys.includes(formattedExEnv)) {
              results.value.push({
                id: "environment",
                text: {
                  type: "text",
                  text: this.t("inspections.environment.not_found", {
                    environment: exEnv,
                  }),
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
                locations: itemLocation,
                doc: {
                  text: this.t("action.learn_more"),
                  link: "https://docs.hoppscotch.io/",
                },
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
   * @returns The inspector results
   */
  getInspectorFor(req: HoppRESTRequest): InspectorResult[] {
    const results = ref<InspectorResult[]>([])

    const headers = req.headers

    const params = req.params

    this.validateEnvironmentVariables([req.endpoint], results, {
      type: "url",
    })

    const headerKeys = Object.values(headers).map((header) => header.key)

    this.validateEnvironmentVariables(headerKeys, results, {
      type: "header",
      position: "key",
    })

    const headerValues = Object.values(headers).map((header) => header.value)

    this.validateEnvironmentVariables(headerValues, results, {
      type: "header",
      position: "value",
    })

    const paramsKeys = Object.values(params).map((param) => param.key)

    this.validateEnvironmentVariables(paramsKeys, results, {
      type: "parameter",
      position: "key",
    })

    const paramsValues = Object.values(params).map((param) => param.value)

    this.validateEnvironmentVariables(paramsValues, results, {
      type: "parameter",
      position: "value",
    })

    return results.value
  }
}
