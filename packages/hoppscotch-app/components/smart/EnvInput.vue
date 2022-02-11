<!--
 This code is a complete adaptation of the work done here
 https://github.com/SyedWasiHaider/vue-highlightable-input
-->

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
import { ref, onMounted, watch, nextTick } from "@nuxtjs/composition-api"
import {
  EditorView,
  placeholder as placeholderExt,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view"
import { EditorState, Extension } from "@codemirror/state"
import clone from "lodash/clone"
import { inputTheme } from "~/helpers/editor/themes/baseTheme"
import { HoppEnvironmentPlugin } from "~/helpers/editor/extensions/HoppEnvironment"
import { useStreamSubscriber } from "~/helpers/utils/composables"

const props = withDefaults(
  defineProps<{
    value: string
    placeholder: string
    styles: string
  }>(),
  {
    value: "",
    placeholder: "",
    styles: "",
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
    if (cachedValue.value !== newVal) {
      cachedValue.value = newVal

      view.value?.dispatch({
        filter: false,
        changes: {
          from: 0,
          to: view.value.state.doc.length,
          insert: newVal,
        },
      })
    }
  },
  {
    immediate: true,
  }
)

const { subscribeToStream } = useStreamSubscriber()

const envTooltipPlugin = new HoppEnvironmentPlugin(subscribeToStream, view)

const initView = (el: any) => {
  const extensions: Extension = [
    inputTheme,
    envTooltipPlugin,
    placeholderExt(props.placeholder),
    ViewPlugin.fromClass(
      class {
        update(update: ViewUpdate) {
          const pasted = !!update.transactions.find((txn) =>
            txn.isUserEvent("input.paste")
          )

          if (update.docChanged) {
            const prevValue = clone(cachedValue.value)

            cachedValue.value = update.state.doc
              .toJSON()
              .join(update.state.lineBreak)

            const value = clone(cachedValue.value)
            emit("input", value)
            emit("change", value)
            if (pasted) {
              nextTick().then(() => {
                emit("paste", {
                  pastedValue: value,
                  prevValue,
                })
              })
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
