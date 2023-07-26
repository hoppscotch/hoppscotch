<template>
  <div :ref="uniqueRef" class="autocomplete-wrapper">
    <div class="absolute inset-0 flex flex-1 overflow-x-auto">
      <div
        ref="editor"
        :placeholder="placeholder"
        class="flex flex-1"
        :class="styles"
        @click="emit('click', $event)"
        @keydown="handleKeystroke"
        @focusin="showSuggestionPopover = true"
      ></div>

      <div v-for="(inspector, index) in inspectors" :key="index">
        <div
          v-if="
            inspector.isApplicable &&
            inspector.componentRefID === uniqueRef &&
            (typeof envIndex !== 'undefined'
              ? inspector.index === envIndex
              : true)
          "
          class="flex justify-center items-center"
        >
          <tippy ref="options" interactive theme="popover">
            <div class="flex justify-center items-center flex-1 felx-col">
              <HoppButtonSecondary
                :icon="inspector.icon"
                :class="severityColor(inspector.severity)"
              />
            </div>
            <template #content="{ hide }">
              <div class="flex flex-col space-y-4 items-start p-2">
                <span v-if="inspector.text.type === 'text'">
                  {{ inspector.text.text }}
                </span>
                <span v-if="inspector.action">
                  <HoppButtonPrimary
                    :label="inspector.action.text"
                    @click="
                      () => {
                        inspector.action?.apply()
                        updateInspectorValue()
                        hide()
                      }
                    "
                  />
                </span>
              </div>
            </template>
          </tippy>
        </div>
      </div>

      <!-- <div
        v-if="inspectors && inspectors[0].isApplicable"
        class="flex justify-center items-center"
      >
        <tippy ref="options" interactive theme="popover">
          <div class="flex justify-center items-center flex-1 flex-col">
            <HoppButtonSecondary
              :icon="inspectors[0].icon"
              :class="severityColor(inspectors[0].severity)"
            />
          </div>
          <template #content="{ hide }">
            <div class="flex flex-col">
              <span v-for="(inspector, index) in inspectors" :key="index">
                {{ inspector.text.text }}
              </span>
            </div>
          </template>
        </tippy>
      </div>
    </div> -->
    </div>
    <ul
      v-if="showSuggestionPopover && autoCompleteSource"
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
          class="hidden md:flex text-secondary items-center"
        >
          <kbd class="shortcut-key">TAB</kbd>
          <span class="ml-2 truncate">to select</span>
        </div>
      </li>
      <li v-if="suggestions.length === 0" class="pointer-events-none">
        <div v-if="slots.empty">
          <slot name="empty"></slot>
        </div>
        <span v-else class="truncate py-0.5">
          {{ t("empty.suggestions") }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed, Ref, useSlots } from "vue"
import {
  EditorView,
  placeholder as placeholderExt,
  ViewPlugin,
  ViewUpdate,
  keymap,
  tooltips,
} from "@codemirror/view"
import { EditorSelection, EditorState, Extension } from "@codemirror/state"
import { clone, uniqueId } from "lodash-es"
import { history, historyKeymap } from "@codemirror/commands"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppReactiveEnvPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { useReadonlyStream } from "@composables/stream"
import { AggregateEnvironment, aggregateEnvs$ } from "~/newstore/environments"
import { platform } from "~/platform"
import { useI18n } from "~/composables/i18n"
import { onClickOutside, watchDebounced, useDebounceFn } from "@vueuse/core"
import { useService } from "dioc/vue"
import {
  InspectionService,
  InspectorChecks,
  InspectorResult,
} from "~/services/inspection"
import { EnvironmentInspectorService } from "~/services/inspection/inspectors/environment.inspector"
import { currentActiveTab } from "~/helpers/rest/tab"
import { URLInspectorService } from "~/services/inspection/inspectors/url.inspector"
import { HeaderInspectorService } from "~/services/inspection/inspectors/header.inspector"
import { invokeAction } from "~/helpers/actions"

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    styles?: string
    envs?: { key: string; value: string; source: string }[] | null
    focus?: boolean
    selectTextOnMount?: boolean
    environmentHighlights?: boolean
    readonly?: boolean
    autoCompleteSource?: string[]
    inspectorChecks?: InspectorChecks
    envIndex?: number | undefined
  }>(),
  {
    modelValue: "",
    placeholder: "",
    styles: "",
    envs: null,
    focus: false,
    readonly: false,
    environmentHighlights: true,
    autoCompleteSource: undefined,
    inspectorChecks: undefined,
    envIndex: undefined,
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

const slots = useSlots()

const uniqueRef = ref(uniqueId().toString())

const t = useI18n()

const cachedValue = ref(props.modelValue)

const view = ref<EditorView>()

const editor = ref<any | null>(null)

const currentSuggestionIndex = ref(-1)
const showSuggestionPopover = ref(false)

const suggestionsMenu = ref<any | null>(null)

onClickOutside(suggestionsMenu, () => {
  showSuggestionPopover.value = false
})

//filter autocompleteSource with unique values
const uniqueAutoCompleteSource = computed(() => {
  if (props.autoCompleteSource) {
    return [...new Set(props.autoCompleteSource)]
  } else {
    return []
  }
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
  } else {
    return uniqueAutoCompleteSource.value ?? []
  }
})

const inspectors = ref<InspectorResult[] | null>(null)

const inspectionService = useService(InspectionService)

useService(EnvironmentInspectorService)
useService(URLInspectorService)
useService(HeaderInspectorService)

const updateInspectorValue = () => {
  const currentTab = currentActiveTab

  const inspecResults = inspectionService.getInspectorFor(
    currentTab.value.document.request,
    currentActiveTab.value.response,
    props.inspectorChecks ?? [],
    uniqueRef
  )
  nextTick(() => {
    inspectors.value = inspecResults
  })
}

watchDebounced(
  () => props.modelValue,
  () => {
    updateInspectorValue()
  },
  { immediate: true, debounce: 500 }
)

const updateModelValue = (value: string) => {
  emit("update:modelValue", value)
  emit("change", value)
  nextTick(() => {
    showSuggestionPopover.value = false
  })
}

onMounted(() => {
  updateInspectorValue()
})

const severityColor = (severity: number) => {
  switch (severity) {
    case 1:
      return "text-green-500"
    case 2:
      return "text-yellow-500"
    case 3:
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

const handleKeystroke = (ev: KeyboardEvent) => {
  if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(ev.key)) {
    ev.preventDefault()
  }

  if (ev.shiftKey) {
    showSuggestionPopover.value = false
    return
  }

  showSuggestionPopover.value = true

  if (
    ["Enter", "Tab"].includes(ev.key) &&
    suggestions.value.length > 0 &&
    currentSuggestionIndex.value > -1
  ) {
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

  if (ev.key === "Enter") {
    emit("enter", ev)
    showSuggestionPopover.value = false
  }

  if (ev.key === "Escape") {
    showSuggestionPopover.value = false
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

const aggregateEnvs = useReadonlyStream(aggregateEnvs$, []) as Ref<
  AggregateEnvironment[]
>

const envVars = computed(() =>
  props.envs
    ? props.envs.map((x) => ({
        key: x.key,
        value: x.value,
        sourceEnv: x.source,
      }))
    : aggregateEnvs.value
)

const envTooltipPlugin = new HoppReactiveEnvPlugin(envVars, view)

const initView = (el: any) => {
  function handleTextSelection() {
    const selection = view.value?.state.selection.main
    if (selection) {
      const from = selection.from
      const to = selection.to
      const text = view.value?.state.doc.sliceString(from, to)
      const { top, left } = view.value?.coordsAtPos(from)
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
  const debounceFn = useDebounceFn(() => {
    handleTextSelection()
  }, 140)

  el.addEventListener("mouseup", debounceFn)
  el.addEventListener("keyup", debounceFn)

  const extensions: Extension = [
    EditorView.contentAttributes.of({ "aria-label": props.placeholder }),
    EditorView.contentAttributes.of({ "data-enable-grammarly": "false" }),
    EditorView.updateListener.of((update) => {
      if (props.readonly) {
        update.view.contentDOM.inputMode = "none"
      }
    }),
    EditorState.changeFilter.of(() => !props.readonly),
    inputTheme,
    props.readonly
      ? EditorView.theme({
          ".cm-content": {
            caretColor: "var(--secondary-dark-color)",
            color: "var(--secondary-dark-color)",
            backgroundColor: "var(--divider-color)",
            opacity: 0.25,
          },
        })
      : EditorView.theme({}),
    tooltips({
      position: "absolute",
    }),
    props.environmentHighlights ? envTooltipPlugin : [],
    placeholderExt(props.placeholder),
    EditorView.domEventHandlers({
      paste(ev) {
        clipboardEv = ev
        pastedValue = ev.clipboardData?.getData("text") ?? ""
      },
      drop(ev) {
        ev.preventDefault()
      },
    }),
    ViewPlugin.fromClass(
      class {
        update(update: ViewUpdate) {
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
          }
        }
      }
    ),
    history(),
    keymap.of([...historyKeymap]),
  ]

  view.value = new EditorView({
    parent: el,
    state: EditorState.create({
      doc: props.modelValue,
      extensions,
    }),
  })
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
</script>

<style lang="scss" scoped>
.autocomplete-wrapper {
  @apply relative;
  @apply flex;
  @apply flex-1;
  @apply flex-shrink-0;
  @apply whitespace-nowrap;

  .suggestions {
    @apply absolute;
    @apply bg-popover;
    @apply z-50;
    @apply shadow-lg;
    @apply max-h-46;
    @apply border-b border-x border-divider;
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
      @apply py-2 px-4;
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
