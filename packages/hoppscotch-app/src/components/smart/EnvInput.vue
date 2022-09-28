<template>
  <div
    class="flex items-center flex-1 flex-shrink-0 overflow-auto whitespace-nowrap"
  >
    <div
      ref="editor"
      :placeholder="placeholder"
      class="flex flex-1"
      :class="styles"
      @keydown.enter.prevent="emit('enter', $event)"
      @keyup="emit('keyup', $event)"
      @click="emit('click', $event)"
      @keydown="emit('keydown', $event)"
    ></div>
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
import { EditorState, Extension } from "@codemirror/state"
import { clone } from "lodash-es"
import { history, historyKeymap } from "@codemirror/commands"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppReactiveEnvPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { useReadonlyStream } from "@composables/stream"
import { AggregateEnvironment, aggregateEnvs$ } from "~/newstore/environments"

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    styles?: string
    envs?: { key: string; value: string; source: string }[] | null
    focus?: boolean
    readonly?: boolean
  }>(),
  {
    modelValue: "",
    placeholder: "",
    styles: "",
    envs: null,
    focus: false,
    readonly: false,
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
    envTooltipPlugin,
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

onMounted(() => {
  if (editor.value) {
    if (!view.value) initView(editor.value)
  }
})

watch(editor, () => {
  if (editor.value) {
    if (!view.value) initView(editor.value)
  } else {
    view.value?.destroy()
    view.value = undefined
  }
})
</script>
