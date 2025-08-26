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

const HOPP_ENVIRONMENT_REGEX = /(<<[a-zA-Z0-9-_]+>>)/g
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
      while (start > from && /[a-zA-Z0-9-_]+/.test(text[start - from - 1]))
        start--
      while (end < to && /[a-zA-Z0-9-_]+/.test(text[end - from])) end++

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
      const envName = tooltipEnv?.sourceEnv ?? "Choose an Environment"

      let envInitialValue = tooltipEnv?.initialValue
      // If the environment is not a request variable, get the current value from the current environment service
      let envCurrentValue =
        tooltipEnv?.sourceEnv !== "RequestVariable"
          ? currentEnvironmentValueService.getEnvironmentByKey(
              tooltipEnv?.sourceEnv !== "Global"
                ? currentSelectedEnvironment.id
                : "Global",
              tooltipEnv?.key ?? ""
            )?.currentValue || tooltipEnv?.currentValue
          : tooltipEnv?.currentValue

      const isSecret = tooltipEnv?.secret === true
      const hasSource = Boolean(tooltipEnv?.sourceEnv)

      const tooltipSourceEnvID =
        tooltipEnv?.sourceEnv === "Global"
          ? "Global"
          : tooltipEnv?.sourceEnv === "CollectionVariable"
            ? tooltipEnv.sourceEnvID!
            : currentSelectedEnvironment.id

      const hasSecretStored = secretEnvironmentService.hasSecretValue(
        tooltipSourceEnvID,
        tooltipEnv?.key ?? ""
      )

      // We need to check if the environment is a secret and if it has a secret value stored in the secret environment service
      // If it is a secret and has a secret value, we need to show "******" in the tooltip
      // If it is a secret and does not have a secret value, we need to show "Empty" in the tooltip
      // If it is not a secret, we need to show the current value or initial value
      // If the environment is not found, we need to show "Not Found" in the tooltip
      // If the source environment is not found, we need to show "Not Found" in the tooltip, ie the the environment
      // is not defined in the selected environment or the global environment
      if (isSecret) {
        if (!hasSecretStored && envInitialValue) {
          envInitialValue = "******"
        } else if (hasSecretStored && !envInitialValue) {
          envCurrentValue = "******"
        } else if (hasSecretStored && envInitialValue) {
          envInitialValue = "******"
          envCurrentValue = "******"
        } else {
          envInitialValue = "Empty"
          envCurrentValue = "Empty"
        }
      } else if (!hasSource) {
        envInitialValue = "Not Found"
        envCurrentValue = "Not Found"
      } else {
        // Parse templates only if needed and values are not already masked
        if (!envCurrentValue && envInitialValue) {
          const parsedInitial = parseTemplateStringE(
            envInitialValue,
            aggregateEnvs
          )
          envInitialValue = E.isLeft(parsedInitial)
            ? "error"
            : parsedInitial.right
        } else if (!envInitialValue && envCurrentValue) {
          const parsedCurrent = parseTemplateStringE(
            envCurrentValue,
            aggregateEnvs
          )
          envCurrentValue = E.isLeft(parsedCurrent)
            ? "error"
            : parsedCurrent.right
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
        editIcon.className =
          "ml-2 cursor-pointer text-accent hover:text-accentDark"
        editIcon.addEventListener("click", () => {
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

          if (
            tooltipEnv?.sourceEnv === "RequestVariable" &&
            restTabs.currentActiveTab.value.document.type === "request"
          ) {
            restTabs.currentActiveTab.value.document.optionTabPreference =
              "requestVariables"
          } else {
            invokeAction(invokeActionType, {
              envName: tooltipEnv?.sourceEnv === "Global" ? "Global" : envName,
              variableName: parsedEnvKey,
              isSecret: tooltipEnv?.secret,
            })
          }
        })
        editIcon.innerHTML = `<span class="inline-flex items-center justify-center my-1">${IconEdit}</span>`
        if (tooltipEnv?.sourceEnv !== "CollectionVariable")
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
  const envSource = aggregateEnvs.find(
    (k: { key: string }) => k.key === env.slice(2, -2)
  )?.sourceEnv

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

        this.envs = [...requestAndCollVars, ...aggregateEnvs]

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
      this.envs = [...requestAndCollVars, ...envs]

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
