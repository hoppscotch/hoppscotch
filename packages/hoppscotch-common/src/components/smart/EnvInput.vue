<template>
  <div ref="autoCompleteWrapper" class="autocomplete-wrapper">
    <div
      class="no-scrollbar absolute inset-0 flex flex-1 divide-x divide-dividerLight overflow-x-auto"
    >
      <input
        v-if="isSecret"
        :id="`secret-${uniqueID()}`"
        v-model="secretText"
        name="secret"
        :placeholder="placeholder"
        class="flex flex-1 bg-transparent pl-4"
        :class="styles"
        type="password"
      />
      <div
        v-else
        ref="editor"
        :placeholder="placeholder"
        class="flex flex-1 truncate relative"
        :class="styles"
        @click="emit('click', $event)"
        @keydown="handleKeystroke"
        @focusin="showSuggestionPopover = true"
      />
      <HoppButtonSecondary
        v-if="secret"
        v-tippy="{ theme: 'tooltip' }"
        :title="isSecret ? t('action.show_secret') : t('action.hide_secret')"
        :icon="isSecret ? IconEyeoff : IconEye"
        @click="toggleSecret"
      />
      <AppInspection
        :inspection-results="inspectionResults"
        class="sticky inset-y-0 right-0 rounded-r bg-primary"
      />
    </div>
    <ul
      v-if="
        showSuggestionPopover && autoCompleteSource && suggestions.length > 0
      "
      ref="suggestionsMenu"
      class="suggestions"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :key="`suggestion-${index}`"
        :class="{ active: currentSuggestionIndex === index }"
        @click="updateModelValue(suggestion)"
      >
        <span class="truncate py-0.5">
          {{ suggestion }}
        </span>
        <div
          v-if="currentSuggestionIndex === index"
          class="hidden items-center text-secondary md:flex"
        >
          <kbd class="shortcut-key">Enter</kbd>
          <span class="ml-2 truncate">to select</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed, Ref } from "vue"
import {
  EditorView,
  placeholder as placeholderExt,
  ViewPlugin,
  ViewUpdate,
  keymap,
  tooltips,
} from "@codemirror/view"
import {
  Compartment,
  EditorSelection,
  EditorState,
  Extension,
} from "@codemirror/state"
import { clone } from "lodash-es"
import { history, historyKeymap } from "@codemirror/commands"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppReactiveEnvPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { HoppPredefinedVariablesPlugin } from "~/helpers/editor/extensions/HoppPredefinedVariables"
import { useReadonlyStream } from "@composables/stream"
import {
  AggregateEnvironment,
  aggregateEnvsWithCurrentValue$,
} from "~/newstore/environments"
import { platform } from "~/platform"
import { onClickOutside, useDebounceFn } from "@vueuse/core"
import { InspectorResult } from "~/services/inspection"
import { invokeAction } from "~/helpers/actions"
import { useI18n } from "~/composables/i18n"
import IconEye from "~icons/lucide/eye"
import IconEyeoff from "~icons/lucide/eye-off"
import { CompletionContext, autocompletion } from "@codemirror/autocomplete"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { syntaxTree } from "@codemirror/language"
import { uniqueID } from "~/helpers/utils/uniqueID"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    styles?: string
    envs?: AggregateEnvironment[] | null
    focus?: boolean
    selectTextOnMount?: boolean
    environmentHighlights?: boolean
    predefinedVariablesHighlights?: boolean
    readonly?: boolean
    autoCompleteSource?: string[]
    inspectionResults?: InspectorResult[] | undefined
    contextMenuEnabled?: boolean
    secret?: boolean
    autoCompleteEnv?: boolean
    autoCompleteEnvSource?: AggregateEnvironment[] | null
  }>(),
  {
    modelValue: "",
    placeholder: "",
    styles: "",
    envs: null,
    focus: false,
    readonly: false,
    environmentHighlights: true,
    predefinedVariablesHighlights: true,
    autoCompleteSource: undefined,
    inspectionResult: undefined,
    inspectionResults: undefined,
    contextMenuEnabled: true,
    secret: false,
    autoCompleteEnv: false,
    autoCompleteEnvSource: null,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", data: string): void
  (e: "change", data: string): void
  (e: "paste", data: { prevValue: string; pastedValue: string }): void
  (e: "enter", ev: any): void
  (e: "keyup", ev: any): void
  (e: "keydown", ev: any): void
  (e: "click", ev: any): void
}>()

const cachedValue = ref(props.modelValue)

const view = ref<EditorView>()

const editor = ref<any | null>(null)

const currentSuggestionIndex = ref(-1)
const showSuggestionPopover = ref(false)

const suggestionsMenu = ref<any | null>(null)
const autoCompleteWrapper = ref<any | null>(null)

const isSecret = ref(props.secret)

const secretText = ref(props.modelValue)

// Compartment to store the readOnly state of the editor
const readOnly = new Compartment()

watch(
  () => secretText.value,
  (newVal) => {
    if (isSecret.value) {
      updateModelValue(newVal)
    }
  }
)

//update secretText when modelValue changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (secretText.value !== newVal) {
      secretText.value = newVal
    }
  },
  {
    immediate: true,
  }
)

onClickOutside(autoCompleteWrapper, () => {
  showSuggestionPopover.value = false
})

const toggleSecret = () => {
  isSecret.value = !isSecret.value
}

//filter autocompleteSource with unique values
const uniqueAutoCompleteSource = computed(() => {
  if (props.autoCompleteSource) {
    return [...new Set(props.autoCompleteSource)]
  }
  return []
})

const suggestions = computed(() => {
  if (
    props.modelValue &&
    props.modelValue.length > 0 &&
    uniqueAutoCompleteSource.value &&
    uniqueAutoCompleteSource.value.length > 0
  ) {
    return uniqueAutoCompleteSource.value.filter((suggestion) =>
      suggestion.toLowerCase().includes(props.modelValue.toLowerCase())
    )
  }
  return uniqueAutoCompleteSource.value ?? []
})

const updateModelValue = (value: string) => {
  emit("update:modelValue", value)
  emit("change", value)
  nextTick(() => {
    showSuggestionPopover.value = false
  })
}

// close the context menu when the input is empty
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      invokeAction("contextmenu.open", {
        position: {
          top: 0,
          left: 0,
        },
        text: null,
      })
    }
  }
)

const handleKeystroke = (ev: KeyboardEvent) => {
  if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(ev.key)) {
    ev.preventDefault()
  }

  if (["Escape", "Tab", "Shift"].includes(ev.key)) {
    showSuggestionPopover.value = false
  }

  if (ev.key === "Enter") {
    if (suggestions.value.length > 0 && currentSuggestionIndex.value > -1) {
      updateModelValue(suggestions.value[currentSuggestionIndex.value])
      currentSuggestionIndex.value = -1

      //used to set codemirror cursor at the end of the line after selecting a suggestion
      nextTick(() => {
        view.value?.dispatch({
          selection: EditorSelection.create([
            EditorSelection.range(
              props.modelValue.length,
              props.modelValue.length
            ),
          ]),
        })
      })
    }

    if (showSuggestionPopover.value) {
      showSuggestionPopover.value = false
    } else {
      emit("enter", ev)
    }
  } else {
    showSuggestionPopover.value = true
  }

  if (ev.key === "ArrowDown") {
    scrollActiveElIntoView()

    currentSuggestionIndex.value =
      currentSuggestionIndex.value < suggestions.value.length - 1
        ? currentSuggestionIndex.value + 1
        : suggestions.value.length - 1

    emit("keydown", ev)
  }

  if (ev.key === "ArrowUp") {
    scrollActiveElIntoView()

    currentSuggestionIndex.value =
      currentSuggestionIndex.value - 1 >= 0
        ? currentSuggestionIndex.value - 1
        : 0

    emit("keyup", ev)
  }

  // used to scroll to the first suggestion when left arrow is pressed
  if (ev.key === "ArrowLeft") {
    if (suggestions.value.length > 0) {
      currentSuggestionIndex.value = 0
      nextTick(() => {
        scrollActiveElIntoView()
      })
    }
  }

  // used to scroll to the last suggestion when right arrow is pressed
  if (ev.key === "ArrowRight") {
    if (suggestions.value.length > 0) {
      currentSuggestionIndex.value = suggestions.value.length - 1
      nextTick(() => {
        scrollActiveElIntoView()
      })
    }
  }
}

// reset currentSuggestionIndex showSuggestionPopover is false
watch(
  () => showSuggestionPopover.value,
  (newVal) => {
    if (!newVal) {
      currentSuggestionIndex.value = -1
    }
  }
)

/**
 * Used to scroll the active suggestion into view
 */
const scrollActiveElIntoView = () => {
  const suggestionsMenuEl = suggestionsMenu.value
  if (suggestionsMenuEl) {
    const activeSuggestionEl = suggestionsMenuEl.querySelector(".active")
    if (activeSuggestionEl) {
      activeSuggestionEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "start",
      })
    }
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    const singleLinedText = newVal.replaceAll("\n", "")

    const currDoc = view.value?.state.doc
      .toJSON()
      .join(view.value.state.lineBreak)

    if (cachedValue.value !== singleLinedText || newVal !== currDoc) {
      cachedValue.value = singleLinedText

      view.value?.dispatch({
        filter: false,
        changes: {
          from: 0,
          to: view.value.state.doc.length,
          insert: singleLinedText,
        },
      })
    }
  },
  {
    immediate: true,
    flush: "sync",
  }
)

let clipboardEv: ClipboardEvent | null = null
let pastedValue: string | null = null

const aggregateEnvs = useReadonlyStream(
  aggregateEnvsWithCurrentValue$,
  []
) as Ref<AggregateEnvironment[]>

const tabs = useService(RESTTabService)

const envVars = computed(() => {
  // If envs are passed directly as props, mask secrets and return them
  if (props.envs?.length) {
    return props.envs.map(
      ({ key, currentValue, initialValue, secret, sourceEnv }) => ({
        key,
        currentValue: secret ? "********" : currentValue,
        initialValue: secret ? "********" : initialValue,
        sourceEnv: sourceEnv ?? "",
        secret,
      })
    )
  }

  const currentTab = tabs.currentActiveTab.value
  const { document } = currentTab
  const isRequest = document.type === "request"
  const isExample = document.type === "example-response"

  // variables inherited from the collection if we're in a request or example
  const collectionVariables =
    isRequest || isExample
      ? transformInheritedCollectionVariablesToAggregateEnv(
          document.inheritedProperties?.variables ?? [],
          false
        )
      : []

  // request-level variables
  const rawRequestVars = isRequest
    ? document.request.requestVariables
    : isExample
      ? document.response.originalRequest.requestVariables
      : []

  // formated request variables
  const requestVariables = rawRequestVars
    .filter((v) => v.active)
    .map(({ key, value }) => ({
      key,
      currentValue: value,
      initialValue: value,
      sourceEnv: "RequestVariable",
      secret: false,
    }))

  return [...requestVariables, ...collectionVariables, ...aggregateEnvs.value]
})

function envAutoCompletion(context: CompletionContext) {
  const options = (props.autoCompleteEnvSource ?? envVars.value ?? [])
    .map((env) => ({
      label: env?.key ? `<<${env.key}>>` : "",
      info: env?.currentValue ?? "",
      apply: env?.key ? `<<${env.key}>>` : "",
    }))
    .filter(Boolean)

  const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
  const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
  const tagBefore = /<<\$?\w*$/.exec(textBefore) // Update regex to match <<$ as well

  if (!tagBefore && !context.explicit) return null
  return {
    from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
    options: options,
    validFor: /^(<<\$?\w*)?$/,
  }
}

const envTooltipPlugin = new HoppReactiveEnvPlugin(envVars, view)
const predefinedVariablePlugin = new HoppPredefinedVariablesPlugin()

function handleTextSelection() {
  const selection = view.value?.state.selection.main
  if (selection) {
    const { from, to } = selection
    if (from === to) return
    const text = view.value?.state.doc.sliceString(from, to)
    const coords = view.value?.coordsAtPos(from)
    const top = coords?.top ?? 0
    const left = coords?.left ?? 0
    if (text) {
      invokeAction("contextmenu.open", {
        position: {
          top,
          left,
        },
        text,
      })
      showSuggestionPopover.value = false
    } else {
      invokeAction("contextmenu.open", {
        position: {
          top,
          left,
        },
        text: null,
      })
    }
  }
}

// Debounce to prevent double click from selecting the word
const debouncedTextSelection = (time: number) =>
  useDebounceFn(() => {
    handleTextSelection()
  }, time)

const initView = (el: any) => {
  // Only add event listeners if context menu is enabled in the component
  if (props.contextMenuEnabled) {
    el.addEventListener("mouseup", debouncedTextSelection(140))
    el.addEventListener("keyup", debouncedTextSelection(140))
  }

  const extensions: Extension = getExtensions(props.readonly || isSecret.value)
  view.value = new EditorView({
    parent: el,
    state: EditorState.create({
      doc: props.modelValue,
      extensions,
    }),
  })
}

const getExtensions = (readonly: boolean): Extension => {
  const readOnlyConfigs = [
    EditorView.updateListener.of((update) => {
      if (readonly) {
        update.view.contentDOM.inputMode = "none"
        update.view.contentDOM.contentEditable = "false"
      }
    }),
    EditorState.changeFilter.of(() => !readonly),
    readonly
      ? EditorView.theme({
          ".cm-content": {
            caretColor: "var(--secondary-dark-color)",
            color: "var(--secondary-dark-color)",
            backgroundColor: "var(--divider-color)",
            opacity: 0.25,
          },
        })
      : EditorView.theme({}),
  ]

  const extensions: Extension = [
    EditorView.contentAttributes.of({ "aria-label": props.placeholder }),
    EditorView.contentAttributes.of({ "data-enable-grammarly": "false" }),
    inputTheme,
    readOnly.of(readOnlyConfigs),
    tooltips({
      parent: document.body,
      position: "absolute",
    }),
    props.environmentHighlights ? envTooltipPlugin : [],
    props.predefinedVariablesHighlights ? predefinedVariablePlugin : [],
    placeholderExt(props.placeholder),
    EditorView.domEventHandlers({
      paste(ev) {
        clipboardEv = ev
        pastedValue = ev.clipboardData?.getData("text") ?? ""
      },
      drop(ev) {
        ev.preventDefault()
      },
      scroll(event) {
        if (event.target && props.contextMenuEnabled) {
          // Debounce to make the performance better
          debouncedTextSelection(30)()
        }
      },
    }),
    props.autoCompleteEnv
      ? autocompletion({
          activateOnTyping: true,
          override: [envAutoCompletion],
          tooltipClass: () => "tooltip-autocomplete",
        })
      : [],

    ViewPlugin.fromClass(
      class {
        update(update: ViewUpdate) {
          // since the readonly prop is reactive, we need to check if it has changed
          if (props.readonly) return

          if (update.docChanged) {
            const prevValue = clone(cachedValue.value)

            cachedValue.value = update.state.doc
              .toJSON()
              .join(update.state.lineBreak)

            // We do not update the cache directly in this case (to trigger value watcher to dispatch)
            // So, we desync cachedValue a bit so we can trigger updates
            const value = clone(cachedValue.value).replaceAll("\n", "")

            emit("update:modelValue", value)
            emit("change", value)

            const pasted = !!update.transactions.find((txn) =>
              txn.isUserEvent("input.paste")
            )

            if (pasted && clipboardEv) {
              const pastedVal = pastedValue
              nextTick(() => {
                emit("paste", {
                  pastedValue: pastedVal!,
                  prevValue,
                })
              })
            } else {
              clipboardEv = null
              pastedValue = null
            }

            if (props.contextMenuEnabled) {
              // close the context menu if text is being updated in the editor
              invokeAction("contextmenu.open", {
                position: {
                  top: 0,
                  left: 0,
                },
                text: null,
              })
            }
          }
        }
      }
    ),
    history(),
    keymap.of([...historyKeymap]),
  ]
  return extensions
}

const triggerTextSelection = () => {
  nextTick(() => {
    view.value?.focus()
    view.value?.dispatch({
      selection: EditorSelection.create([
        EditorSelection.range(0, props.modelValue.length),
      ]),
    })
  })
}
onMounted(() => {
  if (editor.value) {
    if (!view.value) initView(editor.value)
    if (props.selectTextOnMount) triggerTextSelection()
    if (props.focus) view.value?.focus()
    platform.ui?.onCodemirrorInstanceMount?.(editor.value)
  }
})

watch(editor, () => {
  if (editor.value) {
    if (!view.value) initView(editor.value)
    if (props.selectTextOnMount) triggerTextSelection()
  } else {
    view.value?.destroy()
    view.value = undefined
  }
})

/**
 * Watch for changes in the readonly prop
 * and update the editor state accordingly
 */
watch(
  () => props.readonly,
  (isReadOnly) => {
    if (isReadOnly) {
      view.value?.dispatch({
        effects: readOnly.reconfigure([
          EditorView.theme({
            ".cm-content": {
              caretColor: "var(--secondary-dark-color)",
              color: "var(--secondary-dark-color)",
              backgroundColor: "var(--divider-color)",
              opacity: 0.25,
            },
          }),
          EditorState.changeFilter.of(() => false),
          EditorState.readOnly.of(true),
        ]),
      })

      //change input mode and contenteditable to false to prevent keyboard input
      view.value?.contentDOM.setAttribute("inputmode", "none")
      view.value?.contentDOM.setAttribute("contenteditable", "false")
    } else {
      view.value?.dispatch({
        effects: readOnly.reconfigure([
          EditorView.theme({}),
          EditorState.changeFilter.of(() => true),
          EditorState.readOnly.of(false),
        ]),
      })

      //change input mode and contenteditable to true to allow keyboard input
      view.value?.contentDOM.setAttribute("inputmode", "text")
      view.value?.contentDOM.setAttribute("contenteditable", "true")
    }
  },
  {
    immediate: true,
  }
)
</script>

<style lang="scss">
.tooltip-autocomplete {
  @apply z-[1001] #{!important};
}
</style>

<style lang="scss" scoped>
.autocomplete-wrapper {
  @apply relative;
  @apply flex;
  @apply flex-1;
  @apply flex-shrink-0;
  @apply whitespace-nowrap py-4;

  .suggestions {
    @apply absolute;
    @apply bg-popover;
    @apply z-50;
    @apply shadow-lg;
    @apply max-h-46;
    @apply border-x border-b border-divider;
    @apply overflow-y-auto;
    @apply -left-[1px];
    @apply -right-[1px];

    top: calc(100% + 1px);
    border-radius: 0 0 8px 8px;

    li {
      @apply flex;
      @apply items-center;
      @apply justify-between;
      @apply w-full;
      @apply px-4 py-2;
      @apply text-secondary;
      @apply cursor-pointer;

      &:last-child {
        border-radius: 0 0 0 8px;
      }

      &:hover,
      &.active {
        @apply bg-primaryDark;
        @apply text-secondaryDark;
        @apply cursor-pointer;
      }
    }
  }
}
</style>
