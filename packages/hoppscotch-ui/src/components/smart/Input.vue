<template>
  <!-- <div v-if="inputType == 'input'" class="flex flex-col">
    <input
      v-model="inputText"
      v-focus
      class="input floating-input"
      placeholder=" "
      type="text"
      autocomplete="off"
    />
    <label> {{ label }}</label>
  </div> -->

  <div :class="styles">
    <input
      :id="id"
      :class="inputStyle"
      v-model="inputText"
      v-focus
      :placeholder="placeholder"
      type="text"
      autocomplete="off"
      required
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
  }>(),
  {
    id: "",
    styles: "",
    modelValue: "",
    placeholder: "",
    inputType: "input",
    label: "",
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
