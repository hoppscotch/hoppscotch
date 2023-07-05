<template>
  <div class="relative flex" :class="styles">
    <input
      :id="inputID"
      class="input"
      :class="inputStyles"
      v-model="inputText"
      v-focus
      :placeholder="placeholder"
      :type="type"
      @keyup.enter="emit('submit')"
      autocomplete="off"
      required
      :disabled="disabled"
    />

    <label v-if="label.length > 0" :for="inputID"> {{ label }} </label>
    <slot name="button"></slot>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { defineProps } from "vue"

// Unique ID for input
const inputID = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  return `input-${s4()}${s4()}`
}

const props = withDefaults(
  defineProps<{
    id: string
    styles: string
    modelValue: string | null
    placeholder: string
    inputStyles: string | (string | false)[]
    type: string
    label: string
    disabled: boolean
  }>(),
  {
    id: "",
    styles: "",
    modelValue: "",
    placeholder: "",
    inputStyles: "input",
    type: "text",
    label: "",
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: "submit"): void
  (e: "update:modelValue", v: string): void
}>()

const inputText = useVModel(props, "modelValue", emit)
</script>
