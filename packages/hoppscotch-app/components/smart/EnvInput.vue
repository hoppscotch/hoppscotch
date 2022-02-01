<!--
 This code is a complete adaptation of the work done here
 https://github.com/SyedWasiHaider/vue-highlightable-input
-->

<template>
  <div class="env-input-container">
    <div
      ref="editor"
      :placeholder="placeholder"
      class="env-input"
      :class="styles"
      @keydown.enter.prevent="emit('enter', $event)"
      @keyup="emit('keyup', $event)"
      @click="emit('click', $event)"
      @keydown="emit('keydown', $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "@nuxtjs/composition-api"
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { EditorState, Extension } from "@codemirror/state"
import { baseTheme } from "~/helpers/editor/themes/baseTheme"
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
  (e: "enter", ev: any): void
  (e: "keyup", ev: any): void
  (e: "keydown", ev: any): void
  (e: "click", ev: any): void
}>()

const editor = ref<any | null>(null)

const cachedValue = ref(props.value)

const view = ref<EditorView>()

const { subscribeToStream } = useStreamSubscriber()

const envTooltipPlugin = new HoppEnvironmentPlugin(subscribeToStream, view)

const initView = (el: any) => {
  const extensions: Extension = [
    baseTheme,
    envTooltipPlugin,
    ViewPlugin.fromClass(
      class {
        update(update: ViewUpdate) {
          if (update.docChanged) {
            cachedValue.value = update.state.doc
              .toJSON()
              .join(update.state.lineBreak)

            emit("input", cachedValue.value)
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

<style lang="scss" scoped>
.env-input-container {
  @apply relative;
  @apply inline-grid;
  @apply flex-1;
}

[contenteditable] {
  @apply select-text;
  @apply text-secondaryDark;

  &:empty {
    @apply leading-loose;

    &::before {
      @apply text-secondary;
      @apply opacity-35;
      @apply pointer-events-none;

      content: attr(placeholder);
    }
  }
}

.env-input {
  @apply flex;
  @apply items-center;
  @apply justify-items-start;
  @apply whitespace-nowrap;
  @apply overflow-x-auto;
  @apply overflow-y-hidden;
  @apply resize-none;
  @apply focus:outline-none;
}

.env-input::-webkit-scrollbar {
  @apply hidden;
}
</style>
