<template>
  <MonacoScriptEditorImpl
    :model-value="modelValue"
    :type="type"
    :read-only="readOnly"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue"

// Monaco is several MB, so load it the first time a script editor is shown
// instead of on app startup.
const MonacoScriptEditorImpl = defineAsyncComponent(
  () => import("./MonacoScriptEditorImpl.vue")
)

defineProps<{
  modelValue: string
  type: "pre-request" | "post-request"
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()
</script>
