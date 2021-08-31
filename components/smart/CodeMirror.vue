<template>
  <div ref="editor" class="w-full block"></div>
</template>

<script setup lang="ts">
import Codemirror from "codemirror"

import "codemirror/lib/codemirror.css"

import "codemirror/theme/juejin.css"

import "codemirror/addon/display/autorefresh"
import "codemirror/addon/selection/active-line"
import "codemirror/addon/edit/closebrackets"
import "codemirror/addon/display/placeholder"

import { onMounted, ref, watch } from "@nuxtjs/composition-api"

const DEFAULT_THEME = "juejin"

const props = defineProps<{
  value: string
  mode: string
  placeholder: string
  wrap: boolean
}>()

const emit = defineEmits<{
  (e: "input", value: string): void
}>()

watch(
  () => props.value,
  (value) => {
    editor.setValue(value)
  }
)

watch(
  () => props.mode,
  (mode) => {
    editor.setOption("mode", mode)
  }
)

const editor = ref<any | null>(null)

const cm = ref<Codemirror.Editor | null>(null)

onMounted(() => {
  cm.value = Codemirror(editor.value, {
    value: props.value,
    mode: props.mode,
    lineWrapping: props.wrap,
    placeholder: props.placeholder,
    autoRefresh: true,
    lineNumbers: true,
    styleActiveLine: true,
    autoCloseBrackets: true,
    theme: DEFAULT_THEME,
    gutters: ["CodeMirror-linenumbers"],
  })
  cm.value?.on("change", (cm) => {
    const val = cm.getValue()
    emit("input", val)
  })
})
</script>

<style lang="scss" scoped>
.CodeMirror {
  @apply block;
  @apply border-b;
  @apply border-dividerLight;
  @apply w-full;
  @apply h-auto;
  @apply font-mono;
}

.CodeMirror-scroll {
  @apply min-h-32;
}
</style>
