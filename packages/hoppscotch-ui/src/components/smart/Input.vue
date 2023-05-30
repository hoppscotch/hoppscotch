<template>
  <div :class="styles">
    <input
      :id="id"
      :class="inputStyle"
      v-model="inputText"
      v-focus
      :placeholder="placeholder"
      type="text"
      @keyup.enter="emit('submit')"
      autocomplete="off"
      required
      :disabled="disabled"
    />
    <slot name="label"></slot>
    <slot name="button"></slot>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed, defineProps } from "vue"

const props = withDefaults(
  defineProps<{
    id: string
    styles: string
    modelValue: string
    placeholder: string
    inputType: string
    label: string
    disabled: boolean
  }>(),
  {
    id: "",
    styles: "",
    modelValue: "",
    placeholder: "",
    inputType: "input",
    label: "",
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: "submit"): void
  (e: "update:modelValue", v: string): void
}>()

const inputText = useVModel(props, "modelValue", emit)

// watch(inputText, (newValue, oldValue) => console.log(newValue))

const inputStyle = computed(() =>
  props.inputType == "input-button" ? "input" : "input floating-input"
)
</script>

<style lang=""></style>
