<template>
  <div
    class="flex flex-1 items-center flex-shrink-0 whitespace-nowrap overflow-auto hide-scrollbar"
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
import {
  ref,
  onMounted,
  watch,
  nextTick,
  computed,
  Ref,
} from "@nuxtjs/composition-api"
import {
  EditorView,
  placeholder as placeholderExt,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view"
import { EditorState, Extension } from "@codemirror/state"
import clone from "lodash/clone"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppReactiveEnvPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { AggregateEnvironment, aggregateEnvs$ } from "~/newstore/environments"

const props = withDefaults(
  defineProps<{
    value: string
    placeholder: string
    styles: string
    envs: { key: string; value: string; source: string }[] | null
  }>(),
  {
    value: "",
    placeholder: "",
    styles: "",
    envs: null,
  }
)

const emit = defineEmits<{
  (e: "input", data: string): void
  (e: "change", data: string): void
  (e: "paste", data: { prevValue: string; pastedValue: string }): void
  (e: "enter", ev: any): void
  (e: "keyup", ev: any): void
  (e: "keydown", ev: any): void
  (e: "click", ev: any): void
}>()

const cachedValue = ref(props.value)

const view = ref<EditorView>()

const editor = ref<any | null>(null)

watch(
  () => props.value,
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
  }
)

let clipboardEv: ClipboardEvent | null = null

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
    inputTheme,
    envTooltipPlugin,
    placeholderExt(props.placeholder),
    EditorView.domEventHandlers({
      paste(ev) {
        clipboardEv = ev
      },
    }),
    ViewPlugin.fromClass(
      class {
        update(update: ViewUpdate) {
          if (update.docChanged) {
            const prevValue = clone(cachedValue.value)

            cachedValue.value = update.state.doc
              .toJSON()
              .join(update.state.lineBreak)

            // We do not update the cache directly in this case (to trigger value watcher to dispatch)
            // So, we desync cachedValue a bit so we can trigger updates
            const value = clone(cachedValue.value).replaceAll("\n", "")

            emit("input", value)
            emit("change", value)

            const pasted = !!update.transactions.find((txn) =>
              txn.isUserEvent("input.paste")
            )

            if (pasted && clipboardEv) {
              const evHandle = clipboardEv
              nextTick(() => {
                emit("paste", {
                  pastedValue: evHandle.clipboardData?.getData("text") ?? "",
                  prevValue,
                })
              })
            } else {
              clipboardEv = null
            }
          }
        }
      }
    ),
  ]

  view.value = new EditorView({
    parent: el,
    state: EditorState.create({
      doc: props.value,
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
