import { getI18n } from "~/modules/i18n"
import {
  InspectionService,
  Inspector,
  InspectorLocation,
  InspectorRequest,
  InspectorResult,
} from ".."
import { isGQLRequest } from "~/helpers/request-type"
import { Service } from "dioc"
import { Ref, markRaw, computed } from "vue"
import IconPlusCircle from "~icons/lucide/plus-circle"
import {
  AggregateEnvironment,
  aggregateEnvsWithCurrentValue$,
  getCurrentEnvironment,
  getSelectedEnvironmentType,
} from "~/newstore/environments"
import { invokeAction } from "~/helpers/actions"
import { useStreamStatic } from "~/composables/stream"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"
import { HOPP_ENVIRONMENT_REGEX } from "~/helpers/environment-regex"

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
  private readonly restTabs = this.bind(WorkspaceTabsService)

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

    const doc = currentTab.document

    // Get the current request (REST, example-response, or GQL)
    const currentTabRequest =
      doc.type === "request"
        ? doc.request
        : doc.type === "example-response"
          ? doc.response.originalRequest
          : null

    // inherited collection-level variables (REST, example-response, and GQL tabs)
    const collectionVariables =
      doc.type === "request" ||
      doc.type === "example-response" ||
      doc.type === "gql-request"
        ? transformInheritedCollectionVariablesToAggregateEnv(
            doc.inheritedProperties?.variables ?? []
          )
        : []

    // request variables (active only) — only REST/example-response tabs have these
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
    const envKeysSet = new Set(environmentVariables.map((e) => e.key))

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

        if (!envKeysSet.has(formattedExEnv)) {
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
        const doc = currentTab.document

        // Get current request (REST or example-response; GQL tabs don't have requestVariables)
        const currentTabRequest =
          doc.type === "request"
            ? doc.request
            : doc.type === "example-response"
              ? doc.response.originalRequest
              : null

        // request variables (active only) — only REST/example-response tabs have these
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

        // inherited collection variables (REST, example-response, and GQL tabs)
        const collectionVariables =
          doc.type === "request" ||
          doc.type === "example-response" ||
          doc.type === "gql-request"
            ? transformInheritedCollectionVariablesToAggregateEnv(
                doc.inheritedProperties?.variables ?? [],
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
   * Runs all environment-variable inspections for a request.
   * Handles both REST (endpoint/headers/params) and GQL (url/headers) tabs.
   */
  getInspections(req: Readonly<Ref<InspectorRequest>>) {
    return computed(() => {
      const results: InspectorResult[] = []
      if (!req.value) return results

      if (isGQLRequest(req.value)) {
        // GQL: url + active headers only (no params)
        const { url, headers } = req.value

        results.push(
          ...this.validateEnvironmentVariables([url], { type: "url" }),
          ...this.validateEmptyEnvironmentVariables([url], { type: "url" })
        )

        const activeHeaders = headers.filter((h) => h.active)
        const headerKeys = activeHeaders.map((h) => h.key)
        const headerValues = activeHeaders.map((h) => h.value)

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
      } else {
        // REST: endpoint + headers + params
        const { endpoint, headers, params } = req.value as {
          endpoint: string
          headers: { key: string; value: string }[]
          params: { key: string; value: string }[]
        }

        results.push(
          ...this.validateEnvironmentVariables([endpoint], { type: "url" }),
          ...this.validateEmptyEnvironmentVariables([endpoint], { type: "url" })
        )

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
      }

      return results
    })
  }
}
