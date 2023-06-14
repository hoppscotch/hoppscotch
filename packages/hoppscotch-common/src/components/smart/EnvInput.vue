<template>
  <div
    class="autocomplete-wrapper relative flex items-center flex-1 flex-shrink-0 py-4 whitespace-nowrap"
  >
    <div class="absolute inset-0 flex flex-1">
      <div
        ref="editor"
        :placeholder="placeholder"
        class="flex flex-1"
        :class="styles"
        @keydown.enter.prevent="emit('enter', $event)"
        @keyup="emit('keyup', $event)"
        @click="emit('click', $event)"
        @keydown="handleKeystroke"
      ></div>
    </div>
    <div
      v-if="showSuggestionPopover"
      class="suggestions left-0 right-0"
      @click-outside="showSuggestionPopover = false"
    >
      <ul class="overlow-y-auto">
        <li
          v-for="(suggestion, index) in suggestions"
          :key="`suggestion-${index}`"
          class="py-1 px-2 cursor-pointer"
          :class="{ active: currentSuggestionIndex === index }"
          @click.prevent="updateModelValue(suggestion)"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>
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
import { EditorSelection, EditorState, Extension } from "@codemirror/state"
import { clone } from "lodash-es"
import { history, historyKeymap } from "@codemirror/commands"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppReactiveEnvPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { useReadonlyStream } from "@composables/stream"
import { AggregateEnvironment, aggregateEnvs$ } from "~/newstore/environments"
import { platform } from "~/platform"

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

const suggestions = computed(() => {
  if (
    props.modelValue &&
    props.modelValue.length > 0 &&
    props.autoCompleteSource &&
    props.autoCompleteSource.length > 0
  ) {
    return props.autoCompleteSource.filter((suggestion) =>
      suggestion.toLowerCase().includes(props.modelValue.toLowerCase())
    )
  } else {
    return []
  }
})

watch(
  () => suggestions.value,
  (newValue) => {
    if (
      newValue.length > 0 &&
      props.modelValue.length > 0 &&
      props.modelValue !== newValue[0]
    ) {
      showSuggestionPopover.value = true
    } else {
      showSuggestionPopover.value = false
    }
  }
)

const updateModelValue = (value: string) => {
  emit("update:modelValue", value)
  emit("change", value)
  showSuggestionPopover.value = false
}

const handleKeystroke = (ev: KeyboardEvent) => {
  emit("keydown", ev)
  if (ev.key === "ArrowDown") {
    ev.preventDefault()

    currentSuggestionIndex.value =
      currentSuggestionIndex.value < suggestions.value.length - 1
        ? currentSuggestionIndex.value + 1
        : suggestions.value.length - 1
  } else if (ev.key === "ArrowUp") {
    ev.preventDefault()

    currentSuggestionIndex.value =
      currentSuggestionIndex.value - 1 >= 0
        ? currentSuggestionIndex.value - 1
        : 0
  } else if (ev.key === "Enter") {
    ev.preventDefault()
    console.log("enter", currentSuggestionIndex.value, suggestions.value)
    if (currentSuggestionIndex.value >= -1 && suggestions.value.length > 0) {
      emit("update:modelValue", suggestions.value[currentSuggestionIndex.value])
      currentSuggestionIndex.value = -1
    }
  } else if (ev.key === "Tab") {
    ev.preventDefault()

    if (currentSuggestionIndex.value >= -1 && suggestions.value.length > 0) {
      emit("update:modelValue", suggestions.value[currentSuggestionIndex.value])
      currentSuggestionIndex.value = -1
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
  const extensions: Extension = [
    EditorView.contentAttributes.of({ "aria-label": props.placeholder }),
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

  input:focus + ul.suggestions,
  .suggestions:hover {
    @apply block;
  }

  .suggestions {
    @apply absolute;
    @apply bg-popover;
    @apply z-50;
    @apply shadow-lg;
    @apply max-h-46;
    @apply border-b border-x border-divider;
    @apply p-2;
    @apply overflow-hidden;
    @apply top-[calc(100%+2px)];
    @apply left-0;
    @apply right-0;

    ul {
      border-radius: 0 0 8px 8px;
      li {
        @apply w-full;
        @apply py-2 px-2;
        @apply text-secondary;
        @apply font-semibold;

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
}
</style>
