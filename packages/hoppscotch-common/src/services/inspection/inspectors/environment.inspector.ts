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
import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import {
  AggregateEnvironment,
  aggregateEnvsWithCurrentValue$,
  getCurrentEnvironment,
  getSelectedEnvironmentType,
} from "~/newstore/environments"
import { invokeAction } from "~/helpers/actions"
import { computed } from "vue"
import { useStreamStatic } from "~/composables/stream"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { RESTTabService } from "~/services/tab/rest"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"

const HOPP_ENVIRONMENT_REGEX = /(<<[a-zA-Z0-9-_]+>>)/g

const isENVInString = (str: string) => HOPP_ENVIRONMENT_REGEX.test(str)

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
  private readonly secretEnvs = this.bind(SecretEnvironmentService)
  private readonly currentEnvs = this.bind(CurrentValueService)
  private readonly restTabs = this.bind(RESTTabService)

  private aggregateEnvsWithValue = useStreamStatic(
    aggregateEnvsWithCurrentValue$,
    [],
    () => {
      /* noop */
    }
  )[0]

  override onServiceInit() {
    this.inspection.registerInspector(this)
  }

  /**
   * Looks for environment variables in an array of strings.
   * Reports variables that are referenced but not defined.
   * @param target The target array to validate
   * @param locations The location where results are to be displayed
   * @returns The results array containing the results of the validation
   */
  private validateEnvironmentVariables = (
    target: string[],
    locations: InspectorLocation
  ) => {
    const newErrors: InspectorResult[] = []
    const currentTab = this.restTabs.currentActiveTab.value

    // Get the current request or example-response request
    const currentTabRequest =
      currentTab.document.type === "request"
        ? currentTab.document.request
        : currentTab.document.type === "example-response"
          ? currentTab.document.response.originalRequest
          : null

    // inherited collection-level variables
    const collectionVariables =
      currentTab.document.type === "request" ||
      currentTab.document.type === "example-response"
        ? transformInheritedCollectionVariablesToAggregateEnv(
            currentTab.document.inheritedProperties?.variables ?? []
          )
        : []

    // request variables (active only)
    const requestVariables =
      currentTabRequest?.requestVariables
        .filter((v) => v.active)
        .map(({ key, value }) => ({
          key,
          currentValue: value,
          initialValue: value,
          sourceEnv: "RequestVariable",
          secret: false,
        })) ?? []

    // combine everything into one list
    const environmentVariables = [
      ...requestVariables,
      ...collectionVariables,
      ...this.aggregateEnvsWithValue.value,
    ]
    const envKeys = environmentVariables.map((e) => e.key)

    // Scan each string for <<VAR>> patterns
    target.forEach((element, index) => {
      if (!isENVInString(element)) return
      const matches = element.match(HOPP_ENVIRONMENT_REGEX)
      matches?.forEach((exEnv) => {
        const formattedExEnv = exEnv.slice(2, -2)
        const itemLocation: InspectorLocation = {
          type: locations.type,
          position:
            locations.type === "url" ||
            locations.type === "body" ||
            locations.type === "response" ||
            locations.type === "body-content-type-header"
              ? "key"
              : locations.position,
          index,
          key: element,
        }

        // If the variable doesn't exist, add an inspection
        if (!envKeys.includes(formattedExEnv)) {
          newErrors.push({
            id: `environment-not-found-${newErrors.length}`,
            text: {
              type: "text",
              text: this.t("inspections.environment.not_found", {
                environment: exEnv,
              }),
            },
            icon: markRaw(IconPlusCircle),
            action: {
              text: this.t("inspections.environment.add_environment"),
              apply: () =>
                invokeAction("modals.environment.add", {
                  envName: formattedExEnv,
                  variableName: "",
                }),
              showAction: true,
            },
            severity: 3,
            isApplicable: true,
            locations: itemLocation,
            doc: {
              text: this.t("action.learn_more"),
              link: "https://docs.hoppscotch.io/documentation/features/inspections",
            },
          })
        }
      })
    })

    return newErrors
  }

  /**
   * Keeps only unique environment variables and prefers ones with values.
   * @param envs The environment list to be transformed
   * @returns The transformed environment list with keys with value
   */
  private filterNonEmptyEnvironmentVariables = (
    envs: AggregateEnvironment[]
  ): AggregateEnvironment[] => {
    const envsMap = new Map<string, AggregateEnvironment>()

    envs.forEach((env) => {
      if (envsMap.has(env.key)) {
        const existingEnv = envsMap.get(env.key)
        // Replace if existing is empty and this one has a value
        if (existingEnv?.currentValue === "" && env.currentValue !== "") {
          envsMap.set(env.key, env)
        }
      } else {
        envsMap.set(env.key, env)
      }
    })

    return Array.from(envsMap.values())
  }

  /**
   * Looks for variables that exist but are empty (no value or secret).
   * Suggests adding a value for them.
   * @param target The target array to validate
   * @param locations The location where results are to be displayed
   * @returns The results array containing the results of the validation
   */
  private validateEmptyEnvironmentVariables = (
    target: string[],
    locations: InspectorLocation
  ) => {
    const newErrors: InspectorResult[] = []

    target.forEach((element, index) => {
      if (!isENVInString(element)) return
      const matches = element.match(HOPP_ENVIRONMENT_REGEX)
      matches?.forEach((exEnv) => {
        const formattedExEnv = exEnv.slice(2, -2)
        const currentSelectedEnvironment = getCurrentEnvironment()
        const currentTab = this.restTabs.currentActiveTab.value

        // Get current request or example
        const currentTabRequest =
          currentTab.document.type === "request"
            ? currentTab.document.request
            : currentTab.document.type === "example-response"
              ? currentTab.document.response.originalRequest
              : null

        // request variables (active only)
        const requestVariables =
          currentTabRequest?.requestVariables
            .filter((v) => v.active)
            .map(({ key, value }) => ({
              key,
              currentValue: value,
              initialValue: value,
              sourceEnv: "RequestVariable",
              secret: false,
            })) ?? []

        // inherited collection variables
        const collectionVariables =
          currentTab.document.type === "request" ||
          currentTab.document.type === "example-response"
            ? transformInheritedCollectionVariablesToAggregateEnv(
                currentTab.document.inheritedProperties?.variables ?? [],
                false
              )
            : []

        // Merge all variables
        const environmentVariables = this.filterNonEmptyEnvironmentVariables([
          ...requestVariables,
          ...collectionVariables,
          ...this.aggregateEnvsWithValue.value,
        ])

        // Check each variable for missing values
        environmentVariables.forEach((env) => {
          const sourceEnvID =
            env.sourceEnv === "Global"
              ? "Global"
              : env.sourceEnv === "CollectionVariable"
                ? env.sourceEnvID!
                : currentSelectedEnvironment.id

          const hasSecretEnv = this.secretEnvs.hasSecretValue(
            sourceEnvID,
            env.key
          )

          const hasValue =
            this.currentEnvs.hasValue(
              env.sourceEnv !== "Global"
                ? currentSelectedEnvironment.id
                : "Global",
              env.key
            ) ||
            env.currentValue !== "" ||
            env.initialValue !== ""

          if (env.key !== formattedExEnv) return

          // Flag variables that are empty
          if (env.secret ? !hasSecretEnv : !hasValue) {
            const itemLocation: InspectorLocation = {
              type: locations.type,
              position:
                locations.type === "url" ||
                locations.type === "body" ||
                locations.type === "response" ||
                locations.type === "body-content-type-header"
                  ? "key"
                  : locations.position,
              index,
              key: element,
            }

            // Pick the right modal to open for editing
            const currentEnvironmentType = getSelectedEnvironmentType()
            const invokeActionType:
              | "modals.my.environment.edit"
              | "modals.team.environment.edit"
              | "modals.global.environment.update" =
              env.sourceEnv === "Global"
                ? "modals.global.environment.update"
                : currentEnvironmentType === "TEAM_ENV"
                  ? "modals.team.environment.edit"
                  : "modals.my.environment.edit"

            newErrors.push({
              id: `environment-empty-${newErrors.length}`,
              text: {
                type: "text",
                text: this.t("inspections.environment.empty_value", {
                  variable: exEnv,
                }),
              },
              icon: markRaw(IconPlusCircle),
              action: {
                text: this.t("inspections.environment.add_environment_value"),
                apply: () => {
                  // If it's a request variable, open the requestVariables tab
                  if (
                    env.sourceEnv === "RequestVariable" &&
                    currentTab.document.type === "request"
                  ) {
                    currentTab.document.optionTabPreference = "requestVariables"
                  } else {
                    invokeAction(invokeActionType, {
                      envName:
                        env.sourceEnv === "Global"
                          ? "Global"
                          : currentSelectedEnvironment.name,
                      variableName: formattedExEnv,
                      isSecret: env.secret,
                    })
                  }
                },
                showAction: env.sourceEnv !== "CollectionVariable", // skip collection vars for now
              },
              severity: 2,
              isApplicable: true,
              locations: itemLocation,
              doc: {
                text: this.t("action.learn_more"),
                link: "https://docs.hoppscotch.io/documentation/features/inspections",
              },
            })
          }
        })
      })
    })

    return newErrors
  }

  /**
   * Runs all inspections for a given request and returns a computed list of results.
   */
  getInspections(
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>
  ) {
    return computed(() => {
      const results: InspectorResult[] = []
      if (!req.value) return results

      const { endpoint, headers, params } = req.value

      // URL check
      results.push(
        ...this.validateEnvironmentVariables([endpoint], { type: "url" }),
        ...this.validateEmptyEnvironmentVariables([endpoint], { type: "url" })
      )

      // Header keys and values
      const headerKeys = Object.values(headers).map((h) => h.key)
      const headerValues = Object.values(headers).map((h) => h.value)

      results.push(
        ...this.validateEnvironmentVariables(headerKeys, {
          type: "header",
          position: "key",
        }),
        ...this.validateEmptyEnvironmentVariables(headerKeys, {
          type: "header",
          position: "key",
        }),
        ...this.validateEnvironmentVariables(headerValues, {
          type: "header",
          position: "value",
        }),
        ...this.validateEmptyEnvironmentVariables(headerValues, {
          type: "header",
          position: "value",
        })
      )

      // Parameter keys and values
      const paramKeys = Object.values(params).map((p) => p.key)
      const paramValues = Object.values(params).map((p) => p.value)

      results.push(
        ...this.validateEnvironmentVariables(paramKeys, {
          type: "parameter",
          position: "key",
        }),
        ...this.validateEmptyEnvironmentVariables(paramKeys, {
          type: "parameter",
          position: "key",
        }),
        ...this.validateEnvironmentVariables(paramValues, {
          type: "parameter",
          position: "value",
        }),
        ...this.validateEmptyEnvironmentVariables(paramValues, {
          type: "parameter",
          position: "value",
        })
      )

      return results
    })
  }
}
