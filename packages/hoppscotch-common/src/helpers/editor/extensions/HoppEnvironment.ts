import { Compartment } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  hoverTooltip,
} from "@codemirror/view"
import { StreamSubscriberFunc } from "@composables/stream"
import {
  HoppRESTRequestVariables,
  parseTemplateStringE,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { Ref, watch } from "vue"

import { invokeAction } from "~/helpers/actions"
import { getService } from "~/modules/dioc"
import {
  AggregateEnvironment,
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue,
  getCurrentEnvironment,
  getSelectedEnvironmentType,
} from "~/newstore/environments"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { RESTTabService } from "~/services/tab/rest"
import { CurrentValueService } from "~/services/current-environment-value.service"

import IconEdit from "~icons/lucide/edit?raw"
import IconUser from "~icons/lucide/user?raw"
import IconUsers from "~icons/lucide/users?raw"
import IconGlobe from "~icons/lucide/globe?raw"
import IconVariable from "~icons/lucide/variable?raw"
import IconLibrary from "~icons/lucide/library?raw"

import { isComment } from "./helpers"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import {
  ENV_VAR_NAME_REGEX,
  HOPP_ENVIRONMENT_REGEX,
} from "~/helpers/environment-regex"

const HOPP_ENV_HIGHLIGHT =
  "cursor-help transition rounded px-1 focus:outline-none mx-0.5 env-highlight"
const HOPP_REQUEST_VARIABLE_HIGHLIGHT = "request-variable-highlight"
const HOPP_COLLECTION_ENVIRONMENT_HIGHLIGHT = "collection-variable-highlight"
const HOPP_ENVIRONMENT_HIGHLIGHT = "environment-variable-highlight"
const HOPP_GLOBAL_ENVIRONMENT_HIGHLIGHT = "global-variable-highlight"
const HOPP_ENV_HIGHLIGHT_NOT_FOUND = "environment-not-found-highlight"

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)
const restTabs = getService(RESTTabService)

/**
 * Transforms the environment list to a list with unique keys with value
 * @param envs The environment list to be transformed
 * @returns The transformed environment list with keys with value
 */
const filterNonEmptyEnvironmentVariables = (
  envs: AggregateEnvironment[]
): AggregateEnvironment[] => {
  const envsMap = new Map<string, AggregateEnvironment>()
  envs.forEach((env) => {
    if (envsMap.has(env.key)) {
      const existingEnv = envsMap.get(env.key)
      if (
        existingEnv?.currentValue === "" &&
        existingEnv?.initialValue === "" &&
        (env.currentValue || env.initialValue)
      ) {
        envsMap.set(env.key, env)
      }
    } else {
      envsMap.set(env.key, env)
    }
  })
  return Array.from(envsMap.values())
}

const cursorTooltipField = (aggregateEnvs: AggregateEnvironment[]) =>
  hoverTooltip(
    (view, pos, side) => {
      // Check if the current position is inside a comment then disable the tooltip
      if (isComment(view.state, pos)) return null

      const { from, to, text } = view.state.doc.lineAt(pos)

      // TODO: When Codemirror 6 allows this to work (not make the
      // popups appear half of the time) use this implementation
      // const wordSelection = view.state.wordAt(pos)
      // if (!wordSelection) return null
      // const word = view.state.doc.sliceString(
      //   wordSelection.from - 2,
      //   wordSelection.to + 2
      // )
      // if (!HOPP_ENVIRONMENT_REGEX.test(word)) return null

      // Tracking the start and the end of the words
      let start = pos
      let end = pos
      while (start > from && ENV_VAR_NAME_REGEX.test(text[start - from - 1]))
        start--
      while (end < to && ENV_VAR_NAME_REGEX.test(text[end - from])) end++

      if (
        (start === pos && side < 0) ||
        (end === pos && side > 0) ||
        !HOPP_ENVIRONMENT_REGEX.test(
          text.slice(start - from - 2, end - from + 2)
        )
      )
        return null

      const parsedEnvKey = text.slice(start - from, end - from)
      const envsWithNoEmptyValues =
        filterNonEmptyEnvironmentVariables(aggregateEnvs)
      const tooltipEnv = envsWithNoEmptyValues.find(
        (env) => env.key === parsedEnvKey
      )
      const currentSelectedEnvironment = getCurrentEnvironment()
      // For collection variables, use parentName if available, otherwise fallback to sourceEnv
      const envName =
        tooltipEnv?.sourceEnv === "CollectionVariable" && tooltipEnv?.parentName
          ? tooltipEnv.parentName
          : tooltipEnv?.sourceEnv === "CollectionVariable"
            ? "Collection Variable"
            : (tooltipEnv?.sourceEnv ?? "Choose an Environment")

      // Convert AggregateEnvironment[] to Environment["variables"] format for parsing
      // For collection variables, exclude other collection variables to prevent circular references
      const envVarsForParsing =
        tooltipEnv?.sourceEnv === "CollectionVariable"
          ? aggregateEnvs
              .filter((env) => env.sourceEnv !== "CollectionVariable")
              .map((env) => ({
                key: env.key,
                initialValue: env.initialValue || "",
                currentValue: env.currentValue || env.initialValue || "",
                secret: env.secret || false,
              }))
          : aggregateEnvs.map((env) => ({
              key: env.key,
              initialValue: env.initialValue || "",
              currentValue: env.currentValue || env.initialValue || "",
              secret: env.secret || false,
            }))

      // Get initial value - for collection variables, resolve it if it contains env var references
      let envInitialValue = tooltipEnv?.initialValue || ""

      // If the environment is not a request variable, get the current value from the current environment service
      let envCurrentValue =
        tooltipEnv?.sourceEnv !== "RequestVariable"
          ? currentEnvironmentValueService.getEnvironmentByKey(
              tooltipEnv?.sourceEnv !== "Global"
                ? currentSelectedEnvironment.id
                : "Global",
              tooltipEnv?.key ?? ""
            )?.currentValue ||
            tooltipEnv?.currentValue ||
            tooltipEnv?.initialValue ||
            ""
          : tooltipEnv?.currentValue || tooltipEnv?.initialValue || ""

      // For collection variables, resolve both initial and current values against environment variables
      // This is done BEFORE secret/not found checks so the resolved values are used
      if (tooltipEnv?.sourceEnv === "CollectionVariable") {
        // Always try to resolve initialValue - it might contain environment variable references
        // Check if it contains env vars by testing the regex (reset lastIndex first since it's global)
        HOPP_ENVIRONMENT_REGEX.lastIndex = 0
        const hasEnvVarsInInitial = HOPP_ENVIRONMENT_REGEX.test(envInitialValue)
        HOPP_ENVIRONMENT_REGEX.lastIndex = 0

        if (
          envInitialValue &&
          hasEnvVarsInInitial &&
          envVarsForParsing.length > 0
        ) {
          const parsedInitial = parseTemplateStringE(
            envInitialValue,
            envVarsForParsing
          )
          if (E.isRight(parsedInitial)) {
            envInitialValue = parsedInitial.right
          }
        }

        // Resolve currentValue if it contains environment variable references (in case it wasn't already resolved)
        HOPP_ENVIRONMENT_REGEX.lastIndex = 0
        const hasEnvVarsInCurrent = HOPP_ENVIRONMENT_REGEX.test(envCurrentValue)
        HOPP_ENVIRONMENT_REGEX.lastIndex = 0

        if (
          envCurrentValue &&
          hasEnvVarsInCurrent &&
          envVarsForParsing.length > 0
        ) {
          const parsedCurrent = parseTemplateStringE(
            envCurrentValue,
            envVarsForParsing
          )
          if (E.isRight(parsedCurrent)) {
            envCurrentValue = parsedCurrent.right
          }
        }
      }

      const isSecret = tooltipEnv?.secret === true
      const hasSource = Boolean(tooltipEnv?.sourceEnv)

      const tooltipSourceEnvID =
        tooltipEnv?.sourceEnv === "Global"
          ? "Global"
          : tooltipEnv?.sourceEnv === "CollectionVariable"
            ? tooltipEnv.sourceEnvID!
            : currentSelectedEnvironment.id

      const hasSecretValueStored = secretEnvironmentService.hasSecretValue(
        tooltipSourceEnvID,
        tooltipEnv?.key ?? ""
      )
      const hasSecretInitialValueStored =
        secretEnvironmentService.hasSecretInitialValue(
          tooltipSourceEnvID,
          tooltipEnv?.key ?? ""
        )

      // Display secret values as "******" when stored; if no secret is saved, show "Empty" placeholders instead
      if (isSecret) {
        if (hasSecretValueStored && hasSecretInitialValueStored) {
          envInitialValue = "******"
          envCurrentValue = "******"
        } else if (!hasSecretValueStored && hasSecretInitialValueStored) {
          envInitialValue = "******"
        } else if (hasSecretValueStored && !hasSecretInitialValueStored) {
          envCurrentValue = "******"
        } else {
          envInitialValue = "Empty"
          envCurrentValue = "Empty"
        }
      } else if (!hasSource) {
        envInitialValue = "Not Found"
        envCurrentValue = "Not Found"
      } else {
        // Fallback: if currentValue is empty, use initialValue
        if (!envCurrentValue && envInitialValue) {
          envCurrentValue = envInitialValue
        }
      }

      const selectedEnvType = getSelectedEnvironmentType()

      // Set the icon based on the source environment
      const envTypeIcon = `<span class="inline-flex items-center justify-center my-1">${
        tooltipEnv?.sourceEnv === "Global"
          ? IconGlobe
          : tooltipEnv?.sourceEnv === "RequestVariable"
            ? IconVariable
            : selectedEnvType === "TEAM_ENV"
              ? IconUsers
              : tooltipEnv?.sourceEnv === "CollectionVariable"
                ? IconLibrary
                : IconUser
      }</span>`

      const appendEditAction = (tooltip: HTMLElement) => {
        const editIcon = document.createElement("button")
        editIcon.type = "button"
        editIcon.className =
          "ml-2 cursor-pointer text-accent hover:text-accentDark inline-flex items-center justify-center"
        editIcon.setAttribute("aria-label", "Edit variable")
        // Set innerHTML with icon, with fallback text
        if (IconEdit && typeof IconEdit === "string") {
          editIcon.innerHTML = `<span class="inline-flex items-center justify-center my-1">${IconEdit}</span>`
        } else {
          // Fallback: use text if icon fails to load
          editIcon.textContent = "✎"
          editIcon.title = "Edit variable"
        }

        editIcon.addEventListener("click", (e) => {
          e.preventDefault()
          e.stopPropagation()
          // Handle collection variables - navigate to collections page
          if (tooltipEnv?.sourceEnv === "CollectionVariable") {
            const currentTab = restTabs.currentActiveTab.value
            if (
              currentTab.document.type === "request" ||
              currentTab.document.type === "example-response"
            ) {
              const inheritedProps = currentTab.document.inheritedProperties
              if (inheritedProps && tooltipEnv.sourceEnvID) {
                // Navigate to collections page - the user can then find and edit the collection
                invokeAction("navigation.jump.rest")
                // Show a toast message to guide the user
                // Note: We can't directly open the collection properties modal from here
                // as it requires the collection component context
              }
            }
            return
          }

          // Handle request variables
          if (
            tooltipEnv?.sourceEnv === "RequestVariable" &&
            restTabs.currentActiveTab.value.document.type === "request"
          ) {
            restTabs.currentActiveTab.value.document.optionTabPreference =
              "requestVariables"
            return
          }

          // Handle environment variables (Global, My Env, Team Env)
          let invokeActionType:
            | "modals.my.environment.edit"
            | "modals.team.environment.edit"
            | "modals.global.environment.update" = "modals.my.environment.edit"

          if (tooltipEnv?.sourceEnv === "Global")
            invokeActionType = "modals.global.environment.update"
          else if (selectedEnvType === "MY_ENV")
            invokeActionType = "modals.my.environment.edit"
          else if (selectedEnvType === "TEAM_ENV")
            invokeActionType = "modals.team.environment.edit"
          else {
            invokeActionType = "modals.my.environment.edit"
          }

          invokeAction(invokeActionType, {
            envName: tooltipEnv?.sourceEnv === "Global" ? "Global" : envName,
            variableName: parsedEnvKey,
            isSecret: tooltipEnv?.secret,
          })
        })

        // Show edit icon for all variable types including collection variables
        tooltip.appendChild(editIcon)
      }

      return {
        // The start and end positions of the environment variable in the text
        // We add 2 to the end position to include the closing `>>` in the tooltip
        // and -1 to the start position to include the opening `<<` in the tooltip
        pos: start - 1,
        end: end + 2,
        arrow: true,
        create() {
          const dom = document.createElement("div")
          const tooltipContainer = document.createElement("div")

          const tooltipHeaderBlock = document.createElement("div")
          tooltipHeaderBlock.className =
            "flex items-center justify-between w-full space-x-2 "
          tooltipContainer.appendChild(tooltipHeaderBlock)

          const iconNameContainer = document.createElement("div")
          iconNameContainer.className =
            "flex items-center space-x-2 flex-1 mr-4 "
          tooltipHeaderBlock.appendChild(iconNameContainer)

          const icon = document.createElement("span")
          icon.innerHTML = envTypeIcon
          const envNameBlock = document.createElement("span")
          envNameBlock.innerText = envName

          iconNameContainer.appendChild(icon)
          iconNameContainer.appendChild(envNameBlock)

          if (tooltipEnv) appendEditAction(tooltipHeaderBlock)

          const envContainer = document.createElement("div")
          tooltipContainer.appendChild(envContainer)
          envContainer.className =
            "flex flex-col items-start space-y-1 flex-1 w-full mt-2 !z-[1002]"

          const initialValueBlock = document.createElement("div")
          initialValueBlock.className = "flex items-center space-x-2"
          const initialValueTitle = document.createElement("div")
          initialValueTitle.textContent = "Initial"
          initialValueTitle.className = "font-bold mr-4 "
          const initialValue = document.createElement("span")
          initialValue.textContent = envInitialValue || ""
          initialValueBlock.appendChild(initialValueTitle)
          initialValueBlock.appendChild(initialValue)

          const currentValueBlock = document.createElement("div")
          currentValueBlock.className = "flex items-center space-x-2"
          const currentValueTitle = document.createElement("div")
          currentValueTitle.textContent = "Current"
          currentValueTitle.className = "font-bold mr-1.5"
          const currentValue = document.createElement("span")
          currentValue.textContent = envCurrentValue || ""
          currentValueBlock.appendChild(currentValueTitle)
          currentValueBlock.appendChild(currentValue)

          envContainer.appendChild(initialValueBlock)
          envContainer.appendChild(currentValueBlock)

          tooltipContainer.className = "tippy-content env-tooltip-content"
          dom.className = "tippy-box"
          dom.dataset.theme = "tooltip"
          dom.appendChild(tooltipContainer)
          return { dom }
        },
      }
    },
    // HACK: This is a hack to fix hover tooltip not coming half of the time
    // https://github.com/codemirror/tooltip/blob/765c463fc1d5afcc3ec93cee47d72606bed27e1d/src/tooltip.ts#L622
    // Still doesn't fix the not showing up some of the time issue, but this is atleast more consistent
    { hoverTime: 1 } as any
  )

function checkEnv(env: string, aggregateEnvs: AggregateEnvironment[]) {
  let className = HOPP_ENV_HIGHLIGHT_NOT_FOUND
  const envKey = env.slice(2, -2)

  // Prioritize variables in this order: RequestVariable > EnvironmentVariable > CollectionVariable > Global
  // This ensures environment variables (green) take precedence over collection variables (purple)
  const requestVar = aggregateEnvs.find(
    (k: { key: string; sourceEnv: string }) =>
      k.key === envKey && k.sourceEnv === "RequestVariable"
  )
  const envVar = aggregateEnvs.find(
    (k: { key: string; sourceEnv: string }) =>
      k.key === envKey &&
      k.sourceEnv !== "RequestVariable" &&
      k.sourceEnv !== "CollectionVariable" &&
      k.sourceEnv !== "Global"
  )
  const collectionVar = aggregateEnvs.find(
    (k: { key: string; sourceEnv: string }) =>
      k.key === envKey && k.sourceEnv === "CollectionVariable"
  )
  const globalVar = aggregateEnvs.find(
    (k: { key: string; sourceEnv: string }) =>
      k.key === envKey && k.sourceEnv === "Global"
  )

  const matchedEnv = requestVar || envVar || collectionVar || globalVar
  const envSource = matchedEnv?.sourceEnv

  if (envSource === "RequestVariable")
    className = HOPP_REQUEST_VARIABLE_HIGHLIGHT
  else if (envSource === "CollectionVariable")
    className = HOPP_COLLECTION_ENVIRONMENT_HIGHLIGHT
  else if (envSource === "Global") className = HOPP_GLOBAL_ENVIRONMENT_HIGHLIGHT
  else if (envSource !== undefined) className = HOPP_ENVIRONMENT_HIGHLIGHT

  return Decoration.mark({ class: `${HOPP_ENV_HIGHLIGHT} ${className}` })
}

const getMatchDecorator = (aggregateEnvs: AggregateEnvironment[]) =>
  new MatchDecorator({
    regexp: HOPP_ENVIRONMENT_REGEX,
    decoration: (m, view, pos) => {
      // Check if the current position is inside a comment then disable the highlight
      if (isComment(view.state, pos)) return null
      return checkEnv(m[0], aggregateEnvs)
    },
  })

export const environmentHighlightStyle = (
  aggregateEnvs: AggregateEnvironment[]
) => {
  const envsWithNoEmptyValues =
    filterNonEmptyEnvironmentVariables(aggregateEnvs)
  const decorator = getMatchDecorator(envsWithNoEmptyValues)
  return ViewPlugin.define(
    (view) => ({
      decorations: decorator.createDeco(view),
      update(u) {
        this.decorations = decorator.updateDeco(u, this.decorations)
      },
    }),
    { decorations: (v) => v.decorations }
  )
}

/**
 * Function to get the request variables and collection variables in AggregateEnvironment type
 * @param requestVariables Request Variables defined in the request
 * @param collectionVariables Inherited Collection Variables
 * @returns Transforms the request and collection variables to AggregateEnvironment type
 */
const getRequestAndCollectionVariables = (
  requestVariables: HoppRESTRequestVariables,
  collectionVariables: HoppInheritedProperty["variables"]
) => {
  const reqVars = requestVariables
    .filter((v) => v.active)
    .map(({ key, value }) => ({
      key,
      currentValue: value,
      initialValue: value,
      sourceEnv: "RequestVariable",
      secret: false,
    }))

  const collVars = transformInheritedCollectionVariablesToAggregateEnv(
    collectionVariables,
    false
  )

  return [...reqVars, ...collVars]
}

export class HoppEnvironmentPlugin {
  private compartment = new Compartment()
  private envs: AggregateEnvironment[] = []

  constructor(
    subscribeToStream: StreamSubscriberFunc,
    private editorView: Ref<EditorView | undefined>
  ) {
    const aggregateEnvs = getAggregateEnvsWithCurrentValue()
    const currentTab = restTabs.currentActiveTab.value
    const currentTabRequest =
      currentTab.document.type === "example-response"
        ? currentTab.document.response.originalRequest
        : currentTab.document.request
    const currentTabInheritedProperty = currentTab.document.inheritedProperties

    if (!currentTabRequest || !currentTabInheritedProperty) return

    watch(
      [currentTabRequest, currentTabInheritedProperty],
      ([request, document]) => {
        const requestAndCollVars = getRequestAndCollectionVariables(
          request.requestVariables,
          document.variables
        )

        // Prioritize environment variables over collection variables when they have the same key
        // This ensures that environment variables (green) take precedence over collection variables (purple)
        const envVarKeys = new Set(aggregateEnvs.map((env) => env.key))
        const filteredCollVars = requestAndCollVars.filter(
          (collVar) =>
            collVar.sourceEnv !== "CollectionVariable" ||
            !envVarKeys.has(collVar.key)
        )

        this.envs = [...filteredCollVars, ...aggregateEnvs]

        this.editorView.value?.dispatch({
          effects: this.compartment.reconfigure([
            cursorTooltipField(this.envs),
            environmentHighlightStyle(this.envs),
          ]),
        })
      },
      { immediate: true, deep: true }
    )

    const requestAndCollVars = getRequestAndCollectionVariables(
      currentTabRequest.requestVariables,
      currentTabInheritedProperty.variables
    )

    subscribeToStream(aggregateEnvsWithCurrentValue$, (envs) => {
      // Prioritize environment variables over collection variables when they have the same key
      const envVarKeys = new Set(envs.map((env) => env.key))
      const filteredCollVars = requestAndCollVars.filter(
        (collVar) =>
          collVar.sourceEnv !== "CollectionVariable" ||
          !envVarKeys.has(collVar.key)
      )

      this.envs = [...filteredCollVars, ...envs]

      this.editorView.value?.dispatch({
        effects: this.compartment.reconfigure([
          cursorTooltipField(this.envs),
          environmentHighlightStyle(this.envs),
        ]),
      })
    })
  }

  get extension() {
    return this.compartment.of([
      cursorTooltipField(this.envs),
      environmentHighlightStyle(this.envs),
    ])
  }
}

export class HoppReactiveEnvPlugin {
  private compartment = new Compartment()
  private envs: AggregateEnvironment[] = []

  constructor(
    envsRef: Ref<AggregateEnvironment[]>,
    private editorView: Ref<EditorView | undefined>
  ) {
    watch(
      envsRef,
      (envs) => {
        this.envs = envs
        this.editorView.value?.dispatch({
          effects: this.compartment.reconfigure([
            cursorTooltipField(this.envs),
            environmentHighlightStyle(this.envs),
          ]),
        })
      },
      { immediate: true, deep: true }
    )
  }

  get extension() {
    return this.compartment.of([
      cursorTooltipField(this.envs),
      environmentHighlightStyle(this.envs),
    ])
  }
}
