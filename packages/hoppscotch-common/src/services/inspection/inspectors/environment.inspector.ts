import { getI18n } from "~/modules/i18n"
import {
  InspectionService,
  Inspector,
  InspectorLocation,
  InspectorResult,
} from ".."
import { Service } from "dioc"
import { Ref, markRaw } from "vue"
import IconPlusCircle from "~icons/lucide/plus-circle"
import { HoppRESTRequest } from "@hoppscotch/data"
import { aggregateEnvs$ } from "~/newstore/environments"
import { invokeAction } from "~/helpers/actions"
import { computed } from "vue"
import { useStreamStatic } from "~/composables/stream"

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

  private aggregateEnvs = useStreamStatic(aggregateEnvs$, [], () => {
    /* noop */
  })[0]

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
    locations: InspectorLocation
  ) => {
    const newErrors: InspectorResult[] = []

    const envKeys = this.aggregateEnvs.value.map((e) => e.key)

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
              newErrors.push({
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
                      envName: formattedExEnv,
                      variableName: "",
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

    return newErrors
  }

  getInspections(req: Readonly<Ref<HoppRESTRequest>>) {
    return computed(() => {
      const results: InspectorResult[] = []

      const headers = req.value.headers

      const params = req.value.params

      results.push(
        ...this.validateEnvironmentVariables([req.value.endpoint], {
          type: "url",
        })
      )

      const headerKeys = Object.values(headers).map((header) => header.key)

      results.push(
        ...this.validateEnvironmentVariables(headerKeys, {
          type: "header",
          position: "key",
        })
      )

      const headerValues = Object.values(headers).map((header) => header.value)

      results.push(
        ...this.validateEnvironmentVariables(headerValues, {
          type: "header",
          position: "value",
        })
      )

      const paramsKeys = Object.values(params).map((param) => param.key)

      results.push(
        ...this.validateEnvironmentVariables(paramsKeys, {
          type: "parameter",
          position: "key",
        })
      )

      const paramsValues = Object.values(params).map((param) => param.value)

      results.push(
        ...this.validateEnvironmentVariables(paramsValues, {
          type: "parameter",
          position: "value",
        })
      )

      return results
    })
  }
}
