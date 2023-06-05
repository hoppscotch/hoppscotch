<template>
  <div class="relative flex flex-col" :class="styles">
    <input
      :id="uid"
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

    <label v-if="label.length > 0" :for="uid"> {{ label }} </label>

    <!-- <slot name="label"></slot> -->
    <slot name="button"></slot>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { defineProps } from "vue"

const uid = "sdsd"

const props = withDefaults(
  defineProps<{
    id: string
    styles: string
    modelValue: string | null
    placeholder: string
    inputStyles: any
    inputType: string
    type: string
    label: string
    disabled: boolean
  }>(),
  {
    id: "",
    styles: "",
    modelValue: "",
    placeholder: "",
    inputStyles: [],
    inputType: "input",
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

// watch(inputText, (newValue, oldValue) => console.log(newValue))

// const inputStyle = computed(() =>
//   props.inputType == "input-button" ? "input" : "input floating-input"
// )
</script>

<style lang=""></style>
