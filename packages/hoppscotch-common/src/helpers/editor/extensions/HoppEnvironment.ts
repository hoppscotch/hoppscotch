import { Compartment } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  hoverTooltip,
} from "@codemirror/view"
import { StreamSubscriberFunc } from "@composables/stream"
import { parseTemplateStringE } from "@hoppscotch/data"
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
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { CurrentValueService } from "~/services/current-environment-value.service"

import IconEdit from "~icons/lucide/edit?raw"
import IconUser from "~icons/lucide/user?raw"
import IconUsers from "~icons/lucide/users?raw"
import IconGlobe from "~icons/lucide/globe?raw"
import IconVariable from "~icons/lucide/variable?raw"
import IconLibrary from "~icons/lucide/library?raw"

import { isComment } from "./helpers"
import {
  getEffectiveVariablesForRequest,
  filterNonEmptyEnvironmentVariables,
} from "~/helpers/utils/environments"
import {
  ENV_VAR_NAME_REGEX,
  HOPP_ENVIRONMENT_REGEX,
} from "~/helpers/environment-regex"
import {
  stabilizeTooltipHover,
  constrainTooltipToViewport,
  createTooltipValueRow,
} from "~/helpers/utils/tooltip"
import { maskSecretValue } from "~/helpers/utils/secretMask"

const HOPP_ENV_HIGHLIGHT =
  "cursor-help transition rounded px-1 focus:outline-none mx-0.5 env-highlight"
const HOPP_REQUEST_VARIABLE_HIGHLIGHT = "request-variable-highlight"
const HOPP_COLLECTION_ENVIRONMENT_HIGHLIGHT = "collection-variable-highlight"
const HOPP_ENVIRONMENT_HIGHLIGHT = "environment-variable-highlight"
const HOPP_GLOBAL_ENVIRONMENT_HIGHLIGHT = "global-variable-highlight"
const HOPP_ENV_HIGHLIGHT_NOT_FOUND = "environment-not-found-highlight"
// Keep value rows above overlapping CodeMirror decoration layers inside tooltip content.
const TOOLTIP_ENV_CONTAINER_Z_INDEX_CLASS = "!z-[1002]"

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)
const workspaceTabs = getService(WorkspaceTabsService)

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
      const envName = tooltipEnv?.sourceEnv ?? "Choose an Environment"

      let envInitialValue = tooltipEnv?.initialValue

      // If the environment is not a request variable or collection variable, get the current value from the current environment service
      // For collection variables and request variables, use the value directly from tooltipEnv
      let envCurrentValue =
        tooltipEnv?.sourceEnv !== "RequestVariable" &&
        tooltipEnv?.sourceEnv !== "CollectionVariable"
          ? currentEnvironmentValueService.getEnvironmentByKey(
              tooltipEnv?.sourceEnv !== "Global"
                ? currentSelectedEnvironment.id
                : "Global",
              tooltipEnv?.key ?? ""
            )?.currentValue || tooltipEnv?.currentValue
          : tooltipEnv?.currentValue

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

      // Secret-ness follows the resolved variable itself, so the preview matches
      // what the request actually sends. For a duplicate key with a secret and a
      // non-secret sibling, whichever wins resolution (first non-empty by
      // position) is what executes — masking a non-secret winner just because a
      // secret sibling shares its key made the tooltip disagree with execution.
      const isSecret = tooltipEnv?.secret === true

      if (isSecret) {
        if (hasSecretValueStored && hasSecretInitialValueStored) {
          envInitialValue = maskSecretValue(envInitialValue)
          envCurrentValue = maskSecretValue(envCurrentValue)
        } else if (!hasSecretValueStored && hasSecretInitialValueStored) {
          envInitialValue = maskSecretValue(envInitialValue)
        } else if (hasSecretValueStored && !hasSecretInitialValueStored) {
          envCurrentValue = maskSecretValue(envCurrentValue)
        } else {
          envInitialValue = "Empty"
          envCurrentValue = "Empty"
        }
      } else if (!hasSource) {
        envInitialValue = "Not Found"
        envCurrentValue = "Not Found"
      } else {
        // Resolve each column independently so a variable that has BOTH an
        // initial and a current value still previews resolved values (matching
        // what the runner resolves), instead of leaving `<<...>>` unparsed when
        // both are set. Empty values are skipped so they stay empty.
        // `maskValue = true`: a non-secret wrapper like `Bearer <<apiKey>>` must
        // render its nested SECRET reference masked, never as raw plaintext.
        if (envInitialValue) {
          const parsedInitial = parseTemplateStringE(
            envInitialValue,
            aggregateEnvs,
            true
          )
          envInitialValue = E.isLeft(parsedInitial)
            ? "error"
            : parsedInitial.right
        }
        if (envCurrentValue) {
          const parsedCurrent = parseTemplateStringE(
            envCurrentValue,
            aggregateEnvs,
            true
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
            workspaceTabs.currentActiveTab.value.document.type === "request"
          ) {
            workspaceTabs.currentActiveTab.value.document.optionTabPreference =
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
          envContainer.className = `flex flex-col items-start space-y-1 flex-1 w-full mt-2 ${TOOLTIP_ENV_CONTAINER_Z_INDEX_CLASS}`
          envContainer.style.overflow = "hidden"

          // Use createTooltipValueRow for overflow-safe value display
          const initialValueRow = createTooltipValueRow(
            "Initial",
            envInitialValue
          )
          const currentValueRow = createTooltipValueRow(
            "Current",
            envCurrentValue
          )

          envContainer.appendChild(initialValueRow)
          envContainer.appendChild(currentValueRow)

          tooltipContainer.className =
            "tippy-content env-tooltip-content env-tooltip-constrained"
          dom.className = "tippy-box"
          dom.dataset.theme = "tooltip"
          dom.appendChild(tooltipContainer)

          // Apply viewport-aware overflow constraints to the tooltip
          constrainTooltipToViewport(dom, tooltipContainer)

          // Apply an interactive bridge to stabilize hover transitions
          stabilizeTooltipHover(dom)

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

export class HoppEnvironmentPlugin {
  private compartment = new Compartment()
  private envs: AggregateEnvironment[] = []

  constructor(
    subscribeToStream: StreamSubscriberFunc,
    private editorView: Ref<EditorView | undefined>,
    getScopedEnvs?: () => AggregateEnvironment[] | undefined
  ) {
    // A scoped getter (embeds) replaces the live tab/store wiring entirely —
    // the viewer's stored environments must not highlight or resolve there.
    // Watched so scope changes (e.g. request-variable edits) re-render.
    if (getScopedEnvs) {
      watch(
        () => getScopedEnvs() ?? [],
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
      return
    }

    // Watch the current active tab to update the variables accordingly
    watch(
      () => workspaceTabs.currentActiveTab.value,
      (currentTab) => {
        const request =
          currentTab.document.type === "example-response"
            ? currentTab.document.response.originalRequest
            : currentTab.document.request

        const inheritedProperties = currentTab.document.inheritedProperties

        // Extract collection variables safely, handling undefined or non-inherited-property types
        const collectionVariables =
          inheritedProperties && "variables" in inheritedProperties
            ? inheritedProperties.variables
            : []

        // Get request variables if available, otherwise use empty array
        const requestVariables =
          request && "requestVariables" in request
            ? request.requestVariables
            : []

        this.envs = getEffectiveVariablesForRequest(
          requestVariables,
          collectionVariables,
          getAggregateEnvsWithCurrentValue(),
          false
        )

        this.editorView.value?.dispatch({
          effects: this.compartment.reconfigure([
            cursorTooltipField(this.envs),
            environmentHighlightStyle(this.envs),
          ]),
        })
      },
      { immediate: true, deep: true }
    )

    subscribeToStream(aggregateEnvsWithCurrentValue$, (envs) => {
      // Recompute request and collection variables from current tab to avoid stale closure values
      const tab = workspaceTabs.currentActiveTab.value
      const request =
        tab.document.type === "example-response"
          ? tab.document.response.originalRequest
          : tab.document.request
      const inheritedProperties = tab.document.inheritedProperties

      // Get request variables if available, otherwise use empty array
      const requestVariables =
        request && "requestVariables" in request ? request.requestVariables : []

      this.envs = getEffectiveVariablesForRequest(
        requestVariables,
        inheritedProperties?.variables ?? [],
        envs,
        false
      )

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
