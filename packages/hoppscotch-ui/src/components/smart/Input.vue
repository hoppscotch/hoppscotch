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

<script lang="ts">
/*
  This inputIDCounter is tracked in the global scope in order to ensure that each input has a unique ID.
  When we use this component multiple times on the same page, we need to ensure that each input has a unique ID.
  This is because the label's for attribute needs to match the input's id attribute.

  That's why we use a global counter that increments each time we use this component.
*/
let inputIDCounter = 564275
</script>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { defineProps } from "vue"

// Unique ID for input
const inputID = `input-${inputIDCounter++}`

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
