<template>
  <div ref="editor" class="w-full block"></div>
</template>

<script setup lang="ts">
import Codemirror from "codemirror"

import "codemirror/lib/codemirror.css"

import "codemirror/theme/juejin.css"

import "codemirror/addon/fold/foldgutter.css"
import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/comment-fold"
import "codemirror/addon/fold/indent-fold"
import "codemirror/addon/display/autorefresh"

import "codemirror/mode/javascript/javascript"

import { onMounted, ref, watch } from "@nuxtjs/composition-api"

const DEFAULT_THEME = "juejin"

const props = defineProps<{
  value: string
  mode: string
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
    autoRefresh: true,
    lineNumbers: true,
    foldGutter: true,
    theme: DEFAULT_THEME,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  })
  cm.value?.on("change", (instance) => {
    const val = instance.getValue()
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
}

.CodeMirror-scroll {
  @apply min-h-32;
}
</style>
