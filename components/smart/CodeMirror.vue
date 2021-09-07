<template>
  <div ref="editor" class="w-full block"></div>
</template>

<script setup lang="ts">
import "codemirror/mode/javascript/javascript"

import { ref, watch } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { LinterDefinition } from "~/helpers/editor/linting/linter"
import { Completer } from "~/helpers/editor/completion"

const props = withDefaults(
  defineProps<{
    value: string
    mode: string
    placeholder?: string
    wrap?: boolean
    linter: LinterDefinition | null
    completer: Completer | null
  }>(),
  {
    placeholder: "",
    wrap: true,
    linter: null as any,
    completer: null as any,
  }
)

const emit = defineEmits<{
  (e: "input", value: string): void
}>()

const value = ref(props.value)
watch(
  () => props.value,
  (val) => (value.value = val)
)

watch(value, (val) => emit("input", val))

const editor = ref<any | null>(null)

useCodemirror(editor, value, {
  extendedEditorConfig: {
    mode: props.mode,
    placeholder: props.placeholder,
    lineWrapping: props.wrap,
  },
  linter: props.linter,
  completer: props.completer,
})
</script>
